import os


BASE = os.path.dirname(os.path.abspath(__file__))


def asset(filename):
    if not filename:
        return None
    return os.path.join(BASE, filename)


DEMO_CHALLENGES = {
    "isuji-lv1": {
        "id": "isuji-lv1",
        "character": "스마일클리닉 이수지 실장",
        "member": "Demo",
        "level": 1,
        "title": "매출이 이게 뭐야? 리뷰 보면 다들 불친절하다고 난리도 아니야",
        "image": asset("isuji_face.png"),
        "thumb": asset("isuji_thumb.png"),
        "audio": asset("isuji_cut.wav"),
        "words": asset("isuji_words.json"),
        "language": "ko",
        "reward_money": 80,
        "status": "demo_ready",
    },
    "nicholas-lv1": {
        "id": "nicholas-lv1",
        "character": "니콜라스",
        "member": "Demo",
        "level": 1,
        "title": "Ni bu ke ai...",
        "native_title": "你不可爱 谁可爱",
        "image": asset("nicholas_face.jpg"),
        "thumb": asset("nicholas_thumb.png"),
        "audio": asset("nicholas_cut_loud_trim.wav"),
        "words": asset("nicholas_words.json"),
        "language": "zh",
        "reward_money": 100,
        "status": "demo_ready",
    },
    "wonyoung-lv1": {
        "id": "wonyoung-lv1",
        "character": "장원영",
        "member": "Demo",
        "level": 1,
        "title": "완전 럭키비키잖아",
        "image": asset("wonyoung_face.jpg"),
        "thumb": asset("wonyoung_thumb.png"),
        "audio": asset("wonyoung_cut.wav"),
        "words": asset("wonyoung_words.json"),
        "language": "ko",
        "reward_money": 100,
        "status": "demo_ready",
    },
    "minami-lv1": {
        "id": "minami-lv1",
        "character": "미나미",
        "member": "Demo",
        "level": 1,
        "title": "거제 야호",
        "native_title": "巨済ヤッホー",
        "image": asset("minami_face.png"),
        "thumb": asset("minami_thumb.png"),
        "audio": asset("minami_geoje_lv1.wav"),
        "words": asset("minami_geoje_lv1_words.json"),
        "language": "ko",
        "reward_money": 100,
        "status": "demo_ready",
    },
    "minami-lv2": {
        "id": "minami-lv2",
        "character": "미나미",
        "member": "Demo",
        "level": 2,
        "title": "평소에도 야호라고 자주 하세요?",
        "native_title": "いつでも「ヤッホー！」って言ってるんですか？",
        "image": asset("minami_face.png"),
        "thumb": asset("minami_thumb.png"),
        "audio": asset("minami_matteruyo_lv2.wav"),
        "words": asset("minami_matteruyo_lv2_words.json"),
        "language": "ja",
        "reward_money": 130,
        "status": "demo_ready",
        "feedback_points": [
            {
                "kind": "Pitch",
                "time": 0.82,
                "word": "yahho",
                "message": "'yahho'에서 목소리를 밝게 올려주세요. 이 대사의 포인트는 여기서 인사하듯 튀는 느낌입니다.",
            },
            {
                "kind": "Intensity",
                "time": 1.28,
                "word": "tte",
                "message": "'tte'는 짧게 붙여 말하세요. 길게 끌면 일본어 연결감이 어색해집니다.",
            },
            {
                "kind": "Pitch",
                "time": 2.35,
                "word": "ka",
                "message": "마지막 'ka'만 질문처럼 살짝 올려주세요. 너무 세게 끊지 말고 가볍게 끝내면 자연스럽습니다.",
            },
        ],
    },
}


ENHYPEN_CHALLENGES = {
    "jungwon-ko-lv1": {
        "id": "jungwon-ko-lv1",
        "character": "정원",
        "member": "Jungwon",
        "level": 1,
        "title": "한국어 톤 챌린지",
        "native_title": "준비중",
        "image": asset(None),
        "thumb": asset(None),
        "audio": asset(None),
        "words": asset(None),
        "language": "ko",
        "reward_money": 100,
        "status": "needs_clip",
    },
    "heeseung-en-lv1": {
        "id": "heeseung-en-lv1",
        "character": "희승",
        "member": "Heeseung",
        "level": 1,
        "title": "영어 인터뷰 챌린지",
        "native_title": "Clip needed",
        "image": asset(None),
        "thumb": asset(None),
        "audio": asset(None),
        "words": asset(None),
        "language": "en",
        "reward_money": 120,
        "status": "needs_assets",
    },
    "jay-en-lv1": {
        "id": "jay-en-lv1",
        "character": "제이",
        "member": "Jay",
        "level": 1,
        "title": "영어 리액션 챌린지",
        "native_title": "Clip needed",
        "image": asset(None),
        "thumb": asset(None),
        "audio": asset(None),
        "words": asset(None),
        "language": "en",
        "reward_money": 120,
        "status": "needs_assets",
    },
    "jake-en-lv1": {
        "id": "jake-en-lv1",
        "character": "제이크",
        "member": "Jake",
        "level": 1,
        "title": "영어 인터뷰 챌린지",
        "native_title": "Clip needed",
        "image": asset("jake_face.jpg"),
        "thumb": asset(None),
        "audio": asset(None),
        "words": asset(None),
        "language": "en",
        "reward_money": 120,
        "status": "needs_assets",
    },
    "sunghoon-ko-lv1": {
        "id": "sunghoon-ko-lv1",
        "character": "성훈",
        "member": "Sunghoon",
        "level": 1,
        "title": "한국어 말투 챌린지",
        "native_title": "준비중",
        "image": asset(None),
        "thumb": asset(None),
        "audio": asset(None),
        "words": asset(None),
        "language": "ko",
        "reward_money": 100,
        "status": "needs_assets",
    },
    "sunoo-ko-lv1": {
        "id": "sunoo-ko-lv1",
        "character": "선우",
        "member": "Sunoo",
        "level": 1,
        "title": "한국어 리액션 챌린지",
        "native_title": "준비중",
        "image": asset(None),
        "thumb": asset(None),
        "audio": asset(None),
        "words": asset(None),
        "language": "ko",
        "reward_money": 100,
        "status": "needs_assets",
    },
    "niki-ja-lv1": {
        "id": "niki-ja-lv1",
        "character": "니키",
        "member": "NI-KI",
        "level": 1,
        "title": "일본어 리액션 챌린지",
        "native_title": "Clip needed",
        "image": asset(None),
        "thumb": asset(None),
        "audio": asset(None),
        "words": asset(None),
        "language": "ja",
        "reward_money": 120,
        "status": "needs_assets",
    },
}


CHALLENGES = {
    **DEMO_CHALLENGES,
    **ENHYPEN_CHALLENGES,
}


BUNDLE_CHALLENGES = {
    "enhypen-global-interview-pack-1": {
        "id": "enhypen-global-interview-pack-1",
        "title": "ENHYPEN 글로벌 인터뷰팩",
        "subtitle": "Enhypen 전체 멤버",
        "challenge_ids": [
            "jake-en-lv1",
            "heeseung-en-lv1",
            "jay-en-lv1",
            "niki-ja-lv1",
        ],
        "reward_money": 500,
        "price": 0,
    },
    "enhypen-all-member-pack-1": {
        "id": "enhypen-all-member-pack-1",
        "title": "제이+정원+선우 챌린지팩",
        "subtitle": "Enhypen 전체 멤버",
        "challenge_ids": [
            "jay-en-lv1",
            "jungwon-ko-lv1",
            "sunoo-ko-lv1",
        ],
        "reward_money": 900,
        "price": 0,
    },
}


CUSTOMIZATION_ITEMS = [
    {
        "id": "basic-hoodie",
        "name": "베이직 후디",
        "slot": "outfit",
        "price": 120,
        "preview": "HOODIE",
    },
    {
        "id": "stage-jacket",
        "name": "스테이지 재킷",
        "slot": "outfit",
        "price": 260,
        "preview": "JACKET",
    },
    {
        "id": "lavender-bg",
        "name": "연보라 배경",
        "slot": "background",
        "price": 180,
        "preview": "LAVENDER",
    },
]


def file_ready(path):
    return bool(path and os.path.exists(path))


def challenge_ready(challenge):
    return file_ready(challenge.get("audio")) and file_ready(challenge.get("words"))


def image_ready(challenge):
    return file_ready(challenge.get("image"))


def public_challenge(challenge):
    return {
        "id": challenge["id"],
        "character": challenge["character"],
        "member": challenge.get("member"),
        "level": challenge["level"],
        "title": challenge["title"],
        "native_title": challenge.get("native_title"),
        "language": challenge.get("language"),
        "reward_money": challenge.get("reward_money", 100),
        "unlock_price": challenge.get("unlock_price", 0),
        "status": challenge.get("status"),
        "has_image": image_ready(challenge),
        "ready": challenge_ready(challenge),
    }


def public_bundle(bundle):
    items = []
    ready = True
    for challenge_id in bundle["challenge_ids"]:
        challenge = CHALLENGES.get(challenge_id)
        item_ready = bool(challenge and challenge_ready(challenge))
        ready = ready and item_ready
        items.append({
            "id": challenge_id,
            "title": challenge["title"] if challenge else "준비중",
            "character": challenge["character"] if challenge else "준비중",
            "ready": item_ready,
        })

    return {
        "id": bundle["id"],
        "title": bundle["title"],
        "subtitle": bundle["subtitle"],
        "reward_money": bundle["reward_money"],
        "price": bundle.get("price", 0),
        "ready": ready,
        "items": items,
    }
