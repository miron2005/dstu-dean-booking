from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select

from app.models import Appointment, AppealTopic, Notification, ReceptionPeriod
from app.services.periods import count_taken


def create_appointment(db, student, data):
    period = db.scalar(
        select(ReceptionPeriod).where(ReceptionPeriod.id == data.period_id).with_for_update()
    )
    if period is None or period.faculty_id != student.faculty_id:
        raise HTTPException(404, "Период не найден")
    if period.status != "open":
        raise HTTPException(400, "Период отменён")
    if datetime.now(timezone.utc) >= period.starts_at:
        raise HTTPException(400, "Запись возможна только до начала периода")

    topic = db.get(AppealTopic, data.topic_id)
    if topic is None or topic.faculty_id != period.faculty_id or not topic.is_active:
        raise HTTPException(400, "Тема не найдена")

    already = db.scalar(
        select(Appointment.id).where(
            Appointment.period_id == period.id,
            Appointment.student_id == student.id,
            Appointment.status != "cancelled",
        )
    )
    if already is not None:
        raise HTTPException(400, "Вы уже записаны на этот период")
    if count_taken(db, period.id) >= period.capacity:
        raise HTTPException(400, "Свободных мест нет")

    appointment = Appointment(
        period_id=period.id,
        student_id=student.id,
        topic_id=topic.id,
        question=data.question,
        queue_number=period.next_queue_number,
    )
    period.next_queue_number += 1
    db.add(appointment)
    db.commit()
    return appointment


def cancel_appointment(db, student, appointment_id):
    appointment = db.get(Appointment, appointment_id)
    if appointment is None or appointment.student_id != student.id:
        raise HTTPException(404, "Запись не найдена")
    period = db.get(ReceptionPeriod, appointment.period_id)
    if appointment.status != "active":
        raise HTTPException(400, "Запись нельзя отменить")
    if datetime.now(timezone.utc) >= period.starts_at:
        raise HTTPException(400, "Период уже начался")
    appointment.status = "cancelled"
    db.commit()
    return appointment


def get_dean_period(db, dean, period_id):
    period = db.get(ReceptionPeriod, period_id)
    if period is None or period.dean_id != dean.id:
        raise HTTPException(404, "Период не найден")
    return period


def get_queue(db, dean, period_id):
    get_dean_period(db, dean, period_id)
    return db.scalars(
        select(Appointment)
        .where(Appointment.period_id == period_id, Appointment.status != "cancelled")
        .order_by(Appointment.queue_number)
    ).all()


def call_next(db, dean, period_id):
    get_dean_period(db, dean, period_id)
    appointment = db.scalar(
        select(Appointment)
        .where(Appointment.period_id == period_id, Appointment.status == "active")
        .order_by(Appointment.queue_number)
        .limit(1)
        .with_for_update()
    )
    if appointment is None:
        raise HTTPException(404, "Очередь пуста")
    appointment.status = "called"
    db.add(Notification(
        appointment_id=appointment.id,
        kind="called",
        message=f"Вызван ваш номер {appointment.queue_number}",
    ))
    db.commit()
    return appointment


def set_result(db, dean, appointment_id, data):
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(404, "Запись не найдена")
    get_dean_period(db, dean, appointment.period_id)
    if appointment.status != "called":
        raise HTTPException(400, "Сначала нужно вызвать номер")
    appointment.status = data.status
    appointment.result_comment = data.result_comment
    db.commit()
    return appointment
