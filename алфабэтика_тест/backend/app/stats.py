from typing import Any


LESSONS_TOTAL = 19  # 16 уроков + 2 чтения + финал


def _avg(values: list[float | int]) -> float | None:
    nums = [v for v in values if isinstance(v, (int, float)) and v >= 0]
    if not nums:
        return None
    return sum(nums) / len(nums)


def _motivation_label(score: int) -> str:
    if score >= 80:
        return "Горит желанием учиться"
    if score >= 55:
        return "Занимается с интересом"
    if score >= 30:
        return "Потихоньку входит во вкус"
    return "Нужна поддержка и похвала"


def _reaction_label(ms: float | None) -> str:
    if ms is None:
        return "Пока мало данных"
    if ms < 1200:
        return "Молниеносная"
    if ms < 3000:
        return "Живая"
    if ms < 6000:
        return "Спокойная"
    return "Вдумчивая"


def _speed_label(ms: float | None) -> str:
    if ms is None:
        return "Пока мало данных"
    if ms < 2500:
        return "Отвечает очень быстро"
    if ms < 6000:
        return "В своём уверенном темпе"
    return "Не спешит, думает"


def summarize(data: dict[str, Any] | None) -> dict[str, Any]:
    data = data or {}
    done = data.get("done") or {}
    lessons_done = sum(1 for stars in done.values() if stars)
    stars = sum(int(v or 0) for v in done.values())
    sessions = ((data.get("metrics") or {}).get("sessions")) or []
    finished = [s for s in sessions if s.get("completed")]
    abandoned = [s for s in sessions if not s.get("completed")]
    reactions = [s["avgReactionMs"] for s in sessions if s.get("avgReactionMs")]
    answers = [s["avgAnswerMs"] for s in sessions if s.get("avgAnswerMs")]
    corrects = sum(int(s.get("corrects") or 0) for s in sessions)
    mistakes = sum(int(s.get("mistakes") or 0) for s in sessions)
    attempts = corrects + mistakes
    accuracy = (corrects / attempts) if attempts else None

    score = 35
    if LESSONS_TOTAL:
        score += 30 * (lessons_done / LESSONS_TOTAL)
    if accuracy is not None:
        score += 20 * accuracy
    if finished:
        score += 10
    if abandoned and len(abandoned) > len(finished):
        score -= 12
    if finished and _avg([s.get("durationMs") or 0 for s in finished]) and (_avg([s.get("durationMs") or 0 for s in finished]) or 0) > 90_000:
        score += 8
    score = max(0, min(100, round(score)))

    reaction_ms = _avg(reactions)
    answer_ms = _avg(answers)
    return {
        "lessons_done": lessons_done,
        "lessons_total": LESSONS_TOTAL,
        "stars": stars,
        "motivation_score": score,
        "motivation_label": _motivation_label(score),
        "reaction_ms": round(reaction_ms) if reaction_ms is not None else None,
        "reaction_label": _reaction_label(reaction_ms),
        "answer_ms": round(answer_ms) if answer_ms is not None else None,
        "speed_label": _speed_label(answer_ms),
        "sessions": len(sessions),
        "accuracy": round(accuracy, 3) if accuracy is not None else None,
    }
