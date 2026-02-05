from apscheduler.schedulers.background import BackgroundScheduler
from app.database.session import SessionLocal
from app.services.auto_result import generate_auto_result

SERIALS = ["XA","XB","XC","XD","XE","XF","XG","XH","XI","XJ"]

def start_scheduler():
    scheduler = BackgroundScheduler()

    def job():
        db = SessionLocal()
        try:
            for s in SERIALS:
                generate_auto_result(db, s)
        finally:
            db.close()

    scheduler.add_job(job, "interval", minutes=15)
    scheduler.start()
