from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.models import Appointment
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
    if datetime.now(timezone.utc) >= period.starts_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Запись возможна только до начала периода")

    topic = TopicRepository.get_one(data.topic_id, session)
    if topic is None or topic.faculty_id != period.faculty_id or not topic.is_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Тема не найдена")

    if AppointmentRepository.student_has_active(period.id, student.id, session):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Вы уже записаны на этот период")
    if PeriodRepository.count_taken(period.id, session) >= period.capacity:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Свободных мест нет")

    appointment = Appointment(
        period_id=period.id,
        student_id=student.id,
        topic_id=topic.id,
        question=data.question,
        queue_number=period.next_queue_number,
    )
    period.next_queue_number += 1
    return AppointmentRepository.add_one(appointment, session)


def cancel_appointment(session, student, appointment_id):
    appointment = AppointmentRepository.get_one(appointment_id, session)
    if appointment is None or appointment.student_id != student.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    period = PeriodRepository.get_one(appointment.period_id, session)
    if appointment.status != "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Запись нельзя отменить")
    if datetime.now(timezone.utc) >= period.starts_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Период уже начался")
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


def call_next(session, dean, period_id):
    get_dean_period(session, dean, period_id)
    appointment = AppointmentRepository.get_first_active(period_id, session)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Очередь пуста")
    appointment.status = "called"
    NotificationRepository.add(
        appointment.id,
        "called",
        f"Вызван ваш номер {appointment.queue_number}",
        session,
    )
    return AppointmentRepository.add_one(appointment, session)


def set_result(session, dean, appointment_id, data):
    appointment = AppointmentRepository.get_one(appointment_id, session)
    if appointment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
    get_dean_period(session, dean, appointment.period_id)
    if appointment.status != "called":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Сначала нужно вызвать номер")
    appointment.status = data.status
    appointment.result_comment = data.result_comment
    return AppointmentRepository.add_one(appointment, session)
