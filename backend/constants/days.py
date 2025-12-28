
DAY_NAME_TR: dict[int,str] = {
    1: "Pazartesi",
    2: "Salı",
    3: "Çarşamba",
    4: "Perşembe",
    5: "Cuma",
    6: "Cumartesi",
    7: "Pazar"
}

def day_name_tr(day_of_week:int) -> str:
    return DAY_NAME_TR.get(day_of_week,"Bilinmeyen")

