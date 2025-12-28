

GROUP_NO_TO_LETTER: dict[int, str] = {
    1:"A",
    2:"B",
    3:"C",
    4:"D",
    5:"E",
}

def group_letter(group_no:int) -> str:
    return GROUP_NO_TO_LETTER.get(group_no,str(group_no))