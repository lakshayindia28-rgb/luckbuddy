from datetime import datetime

def current_timeslot():
    now = datetime.now()
    start = (now.minute // 15) * 15
    end = start + 15
    return f"{now.hour:02d}:{start:02d}-{now.hour:02d}:{end:02d}"
