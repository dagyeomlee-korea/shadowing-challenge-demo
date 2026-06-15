import os


BASE = os.path.dirname(os.path.abspath(__file__))

CHALLENGES = {
    "isuji-lv1": {
        "id": "isuji-lv1",
        "character": "스마일클리닉 이수지 실장",
        "level": 1,
        "title": "매출이 이게 뭐야? 리뷰 보면 다들 불친절하다고 난리도 아니야",
        "image": os.path.join(BASE, "isuji_face.png"),
        "thumb": os.path.join(BASE, "isuji_thumb.png"),
        "audio": os.path.join(BASE, "isuji_cut.wav"),
        "words": os.path.join(BASE, "isuji_words.json"),
        "language": "ko",
    },
    "nicholas-lv1": {
        "id": "nicholas-lv1",
        "character": "니콜라스",
        "level": 1,
        "title": "Ni bu ke ai...",
        "native_title": "你不可爱 谁可爱",
        "image": os.path.join(BASE, "nicholas_face.jpg"),
        "thumb": os.path.join(BASE, "nicholas_thumb.png"),
        "audio": os.path.join(BASE, "nicholas_cut_loud_trim.wav"),
        "words": os.path.join(BASE, "nicholas_words.json"),
        "language": "zh",
    },
    "wonyoung-lv1": {
        "id": "wonyoung-lv1",
        "character": "장원영",
        "level": 1,
        "title": "완전 럭키비키잖아",
        "image": os.path.join(BASE, "wonyoung_face.jpg"),
        "thumb": os.path.join(BASE, "wonyoung_thumb.png"),
        "audio": os.path.join(BASE, "wonyoung_cut.wav"),
        "words": os.path.join(BASE, "wonyoung_words.json"),
        "language": "ko",
    },
    "minami-lv1": {
        "id": "minami-lv1",
        "character": "미나미",
        "level": 1,
        "title": "거제 야호",
        "native_title": "巨済ヤッホー",
        "image": os.path.join(BASE, "minami_face.png"),
        "thumb": os.path.join(BASE, "minami_thumb.png"),
        "audio": os.path.join(BASE, "minami_geoje_lv1.wav"),
        "words": os.path.join(BASE, "minami_geoje_lv1_words.json"),
        "language": "ko",
    },
    "minami-lv2": {
        "id": "minami-lv2",
        "character": "미나미",
        "level": 2,
        "title": "마떼루요",
        "native_title": "待ってるよ",
        "image": os.path.join(BASE, "minami_face.png"),
        "thumb": os.path.join(BASE, "minami_thumb.png"),
        "audio": os.path.join(BASE, "minami_matteruyo_lv2.wav"),
        "words": os.path.join(BASE, "minami_matteruyo_lv2_words.json"),
        "language": "ja",
        "feedback_points": [
            {
                "kind": "Pitch",
                "time": 0.22,
                "word": "마",
                "message": "'마'는 낮게 깔고 시작하세요. 처음부터 목소리를 확 올리면 일본어 느낌이 덜 납니다.",
            },
            {
                "kind": "Intensity",
                "time": 0.78,
                "word": "떼",
                "message": "'떼'에서 intensity를 살짝 살려주세요. 기다리는 느낌이 여기서 살아납니다.",
            },
            {
                "kind": "Pitch",
                "time": 1.45,
                "word": "요",
                "message": "'요'는 길게 끌되 끝을 너무 올리지 말고 부드럽게 내려보세요.",
            },
        ],
    },
}


def public_challenge(challenge):
    return {
        "id": challenge["id"],
        "character": challenge["character"],
        "level": challenge["level"],
        "title": challenge["title"],
        "native_title": challenge.get("native_title"),
        "language": challenge.get("language"),
        "ready": os.path.exists(challenge["audio"]) and os.path.exists(challenge["words"]),
    }
