from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.database import Model, engine
from app.routers import appointments, auth, deans, faculties, health, notifications, periods, topics, users


@asynccontextmanager
async def lifespan(app):
    Model.metadata.create_all(engine)
    yield


app = FastAPI(title="Запись в деканат ДГТУ", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(faculties.router)
app.include_router(deans.router)
app.include_router(users.router)
app.include_router(topics.router)
app.include_router(periods.router)
app.include_router(appointments.router)
app.include_router(notifications.router)
