def validate_number(n: int):
    if n < 0 or n > 99:
        raise ValueError("Number must be between 0 and 99")

def validate_serial(serial: str):
    if serial not in ["XA","XB","XC","XD","XE","XF","XG","XH","XI","XJ"]:
        raise ValueError("Invalid serial")
