from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models import Appointment
from app.services import slots
from app.repositories import (
    AppointmentRepository,
    NotificationRepository,
    PeriodRepository,
    TopicRepository,
)


def create_appointment(session, student, data):
    period = PeriodRepository.get_one(data.period_id, session, for_update=True)
    if period is None or period.faculty_id != student.faculty_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Период не найден")
    if period.status != "open":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Период отменён")
    if data.slot_start not in slots.slot_grid(period):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "В этом периоде нет такого окна")
    if data.slot_start < slots.booking_deadline():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "До начала окна слишком мало времени, выберите другое")
    if data.slot_start in AppointmentRepository.get_taken_starts(period.id, session):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Это время уже занято")

    if data.topic_id is not None:
        topic = TopicRepository.get_one(data.topic_id, session)
        if topic is None or topic.faculty_id != period.faculty_id or not topic.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Тема не найдена")

    if AppointmentRepository.student_has_active(period.id, student.id, session):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Вы уже записаны на этот период")

    appointment = Appointment(
        period_id=period.id,
        student_id=student.id,
        topic_id=data.topic_id,
        question=data.question,
        queue_number=period.next_queue_number,
        slot_start=data.slot_start,
    )
    period.next_queue_number += 1
    return AppointmentRepository.add_one(appointment, session)


def release_slot_if_early(appointment, new_status):
    now = datetime.now(timezone.utc)
    if new_status == "accepted" and appointment.slot_start is not None and appointment.slot_start > now:
        appointment.slot_start = now


def cancel_appointment(session, student, appointment_id):
    appointment = AppointmentRepository.get_one(appointment_id, session)
    if appointment is None or appointment.student_id != student.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    period = PeriodRepository.get_one(appointment.period_id, session)
    if appointment.status != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Запись нельзя отменить")
    if datetime.now(timezone.utc) >= (appointment.slot_start or period.starts_at):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Время приёма уже наступило")
    appointment.status = "cancelled"
    return AppointmentRepository.add_one(appointment, session)


def get_dean_period(session, dean, period_id):
    period = PeriodRepository.get_one(period_id, session)
    if period is None or period.dean_id != dean.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Период не найден")
    return period


def get_queue(session, dean, period_id):
    get_dean_period(session, dean, period_id)
    return AppointmentRepository.get_queue(period_id, session)


def call_appointment(session, appointment):
    appointment.status = "called"
    room = appointment.period.room
    NotificationRepository.add(
        appointment.id,
        "called",
        "Вас вызвали на приём" + (f", аудитория {room}" if room else ""),
        session,
    )
    return AppointmentRepository.add_one(appointment, session)


def call_next(session, dean, period_id):
    get_dean_period(session, dean, period_id)
    appointment = AppointmentRepository.get_first_active(period_id, session)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Очередь пуста")
    return call_appointment(session, appointment)


def call_student(session, dean, appointment_id):
    appointment = AppointmentRepository.get_one(appointment_id, session, for_update=True)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    get_dean_period(session, dean, appointment.period_id)
    if appointment.status != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Вызвать можно только студента, который ожидает приёма")
    return call_appointment(session, appointment)


def set_result(session, dean, appointment_id, data):
    appointment = AppointmentRepository.get_one(appointment_id, session)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    get_dean_period(session, dean, appointment.period_id)
    if appointment.status != "called":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Сначала нужно вызвать номер")
    appointment.status = data.status
    appointment.result_comment = data.result_comment
    release_slot_if_early(appointment, data.status)
    return AppointmentRepository.add_one(appointment, session)


STATUS_TRANSITIONS = {
    "active": {"called", "cancelled"},
    "called": {"accepted", "no_show", "cancelled"},
}


def get_staff_appointment(session, staff, appointment_id):
    appointment = AppointmentRepository.get_one(appointment_id, session)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    period = PeriodRepository.get_one(appointment.period_id, session)
    if staff.role != "admin" and period.faculty_id != staff.faculty_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    return appointment


def list_appointments(session, staff, period_id, status_filter):
    faculty_id = None if staff.role == "admin" else staff.faculty_id
    return AppointmentRepository.get_all(faculty_id, period_id, status_filter, session)


def change_status(session, staff, appointment_id, data):
    appointment = get_staff_appointment(session, staff, appointment_id)
    if data.status not in STATUS_TRANSITIONS.get(appointment.status, set()):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Нельзя перевести запись из статуса {appointment.status} в {data.status}",
        )
    appointment.status = data.status
    release_slot_if_early(appointment, data.status)
    if data.result_comment is not None:
        appointment.result_comment = data.result_comment
    if data.status == "called":
        NotificationRepository.add(
            appointment.id, "called", f"Вызван ваш номер {appointment.queue_number}", session
        )
    if data.status == "cancelled":
        NotificationRepository.add(
            appointment.id, "cancelled_by_staff", "Ваша запись отменена сотрудником деканата", session
        )
    return AppointmentRepository.add_one(appointment, session)
