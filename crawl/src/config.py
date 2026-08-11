"""Configuration & shared constants."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Locations: normalized alias -> per-source codes
# ---------------------------------------------------------------------------

CITY_ALIASES: dict[str, list[str]] = {
    'an giang': ['an giang'],
    'ba ria vung tau': ['ba ria vung tau', 'vung tau', 'bà rịa vũng tàu', 'vũng tàu', 'bà rịa - vũng tàu', 'ba ria - vung tau'],
    'bac giang': ['bac giang', 'bắc giang'],
    'bac kan': ['bac kan', 'bắc kạn'],
    'bac lieu': ['bac lieu', 'bạc liêu'],
    'bac ninh': ['bac ninh', 'bắc ninh'],
    'ben tre': ['ben tre', 'bến tre'],
    'binh dinh': ['binh dinh', 'bình định'],
    'binh duong': ['binh duong', 'bình dương'],
    'binh phuoc': ['binh phuoc', 'bình phước'],
    'binh thuan': ['binh thuan', 'bình thuận'],
    'ca mau': ['ca mau', 'cà mau'],
    'cao bang': ['cao bang', 'cao bằng'],
    'can tho': ['can tho', 'cần thơ'],
    'da nang': ['da nang', 'dn', 'đà nẵng'],
    'dak lak': ['dak lak', 'đắk lắk'],
    'dak nong': ['dak nong', 'đắk nông'],
    'dien bien': ['dien bien', 'điện biên'],
    'dong nai': ['dong nai', 'đồng nai'],
    'dong thap': ['dong thap', 'đồng tháp'],
    'gia lai': ['gia lai'],
    'ha giang': ['ha giang', 'hà giang'],
    'ha nam': ['ha nam', 'hà nam'],
    'hanoi': ['ha noi', 'hn', 'hà nội'],
    'ha tinh': ['ha tinh', 'hà tĩnh'],
    'hai duong': ['hai duong', 'hải dương'],
    'hai phong': ['hai phong', 'hải phòng'],
    'hau giang': ['hau giang', 'hậu giang'],
    'hoa binh': ['hoa binh', 'hòa bình'],
    'ho chi minh': ['ho chi minh', 'hcm', 'hcmc', 'tphcm', 'tp.hcm', 'sai gon', 'saigon', 'hồ chí minh'],
    'hung yen': ['hung yen', 'hưng yên'],
    'khanh hoa': ['khanh hoa', 'nha trang', 'khánh hòa'],
    'kien giang': ['kien giang', 'phu quoc', 'kiên giang'],
    'kon tum': ['kon tum'],
    'lai chau': ['lai chau', 'lai châu'],
    'lam dong': ['lam dong', 'da lat', 'dalat', 'lâm đồng'],
    'lang son': ['lang son', 'lạng sơn'],
    'lao cai': ['lao cai', 'lào cai'],
    'long an': ['long an'],
    'nam dinh': ['nam dinh', 'nam định'],
    'nghe an': ['nghe an', 'vinh', 'nghệ an'],
    'ninh binh': ['ninh binh', 'ninh bình'],
    'ninh thuan': ['ninh thuan', 'ninh thuận'],
    'phu tho': ['phu tho', 'phú thọ'],
    'phu yen': ['phu yen', 'phú yên'],
    'quang binh': ['quang binh', 'quảng bình'],
    'quang nam': ['quang nam', 'quảng nam'],
    'quang ngai': ['quang ngai', 'quảng ngãi'],
    'quang ninh': ['quang ninh', 'ha long', 'quảng ninh'],
    'quang tri': ['quang tri', 'quảng trị'],
    'soc trang': ['soc trang', 'sóc trăng'],
    'son la': ['son la', 'sơn la'],
    'tay ninh': ['tay ninh', 'tây ninh'],
    'thai binh': ['thai binh', 'thái bình'],
    'thai nguyen': ['thai nguyen', 'thái nguyên'],
    'thanh hoa': ['thanh hoa', 'thanh hóa'],
    'thua thien hue': ['thua thien hue', 'hue', 'huế', 'thừa thiên huế'],
    'tien giang': ['tien giang', 'tiền giang'],
    'tra vinh': ['tra vinh', 'trà vinh'],
    'tuyen quang': ['tuyen quang', 'tuyên quang'],
    'vinh long': ['vinh long', 'vĩnh long'],
    'vinh phuc': ['vinh phuc', 'vĩnh phúc'],
    'yen bai': ['yen bai', 'yên bái'],
    'remote': ['remote', 'from anywhere', 'làm việc từ xa', '100% remote'],
    'international': ['international', 'quốc tế', 'nước ngoài', 'oversea', 'abroad'],
    'others': ['others', 'khác', 'other'],
}

VIETNAMWORKS_CITY_IDS: dict[str, int] = {
    'hanoi': 24,
    'ho chi minh': 29,
    'hai phong': 28,
    'da nang': 17,
    'can tho': 15,
    'ba ria vung tau': 3,
    'an giang': 2,
    'bac giang': 5,
    'bac kan': 4,
    'bac lieu': 6,
    'bac ninh': 7,
    'ben tre': 8,
    'binh dinh': 10,
    'binh duong': 11,
    'binh phuoc': 12,
    'binh thuan': 13,
    'ca mau': 14,
    'cao bang': 16,
    'dak lak': 18,
    'dak nong': 73,
    'dien bien': 69,
    'dong nai': 19,
    'dong thap': 20,
    'gia lai': 21,
    'ha giang': 22,
    'ha nam': 23,
    'ha tinh': 26,
    'hai duong': 27,
    'hau giang': 72,
    'hoa binh': 30,
    'hung yen': 32,
    'khanh hoa': 33,
    'kien giang': 61,
    'kon tum': 34,
    'lai chau': 35,
    'lam dong': 36,
    'lang son': 37,
    'lao cai': 38,
    'long an': 39,
    'nam dinh': 40,
    'nghe an': 41,
    'ninh binh': 42,
    'ninh thuan': 43,
    'phu tho': 44,
    'phu yen': 45,
    'quang binh': 46,
    'quang nam': 47,
    'quang ngai': 48,
    'quang ninh': 49,
    'quang tri': 50,
    'soc trang': 51,
    'son la': 52,
    'tay ninh': 53,
    'thai binh': 54,
    'thai nguyen': 55,
    'thanh hoa': 56,
    'thua thien hue': 57,
    'tien giang': 58,
    'tra vinh': 59,
    'tuyen quang': 60,
    'vinh long': 62,
    'vinh phuc': 63,
    'yen bai': 65,
    'international': 70,
}

ITVIEC_CITY_SLUGS: dict[str, str] = {
    'hanoi': 'ha-noi',
    'ho chi minh': 'ho-chi-minh-hcm',
    'da nang': 'da-nang',
    'bac ninh': 'bac-ninh',
    'thua thien hue': 'hue',
    'can tho': 'can-tho',
    'dong nai': 'dong-nai',
    'tay ninh': 'tay-ninh',
    'international': 'international',
    'others': 'others',
}
TOPCV_CITY_PARAMS: dict[str, tuple[str, str, str]] = {
    'hanoi': ['ha-noi', 'kl1', 'l1'],
    'ho chi minh': ['ho-chi-minh', 'kl2', 'l2'],
    'bac ninh': ['bac-ninh', 'kl4', 'l4'],
    'dong nai': ['dong-nai', 'kl5', 'l5'],
    'hung yen': ['hung-yen', 'kl6', 'l6'],
    'da nang': ['da-nang', 'kl8', 'l8'],
    'hai phong': ['hai-phong', 'kl9', 'l9'],
    'an giang': ['an-giang', 'kl10', 'l10'],
    'ca mau': ['ca-mau', 'kl19', 'l19'],
    'can tho': ['can-tho', 'kl20', 'l20'],
    'cao bang': ['cao-bang', 'kl21', 'l21'],
    'dak lak': ['dak-lak', 'kl23', 'l23'],
    'dien bien': ['dien-bien', 'kl25', 'l25'],
    'dong thap': ['dong-thap', 'kl26', 'l26'],
    'gia lai': ['gia-lai', 'kl27', 'l27'],
    'ha tinh': ['ha-tinh', 'kl30', 'l30'],
    'khanh hoa': ['khanh-hoa', 'kl33', 'l33'],
    'lai chau': ['lai-chau', 'kl36', 'l36'],
    'lam dong': ['lam-dong', 'kl37', 'l37'],
    'lang son': ['lang-son', 'kl38', 'l38'],
    'lao cai': ['lao-cai', 'kl39', 'l39'],
    'nghe an': ['nghe-an', 'kl45', 'l45'],
    'ninh binh': ['ninh-binh', 'kl46', 'l46'],
    'phu tho': ['phu-tho', 'kl48', 'l48'],
    'quang ngai': ['quang-ngai', 'kl52', 'l52'],
    'quang ninh': ['quang-ninh', 'kl53', 'l53'],
    'quang tri': ['quang-tri', 'kl54', 'l54'],
    'son la': ['son-la', 'kl56', 'l56'],
    'tay ninh': ['tay-ninh', 'kl57', 'l57'],
    'thai nguyen': ['thai-nguyen', 'kl59', 'l59'],
    'thanh hoa': ['thanh-hoa', 'kl60', 'l60'],
    'thua thien hue': ['thua-thien-hue', 'kl61', 'l61'],
    'tuyen quang': ['tuyen-quang', 'kl65', 'l65'],
    'vinh long': ['vinh-long', 'kl66', 'l66'],
    'international': ['nuoc-ngoai', 'kl100', 'l100'],
}


# Source -> canonical city map (used to skip sources that don't support a city)
SOURCE_CITY_MAPS: dict[str, dict] = {
    "vietnamworks": VIETNAMWORKS_CITY_IDS,
    "itviec": ITVIEC_CITY_SLUGS,
    "topcv": TOPCV_CITY_PARAMS,
}

USER_AGENTS: list[str] = [
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/17.4 Safari/605.1.15"
    ),
]

REQUEST_TIMEOUT: float = float(os.environ.get("CRAWLER_TIMEOUT", "20"))
MAX_RETRIES: int = int(os.environ.get("CRAWLER_MAX_RETRIES", "3"))
RETRY_BACKOFF: float = float(os.environ.get("CRAWLER_RETRY_BACKOFF", "1.0"))
PER_SOURCE_DELAY: float = float(os.environ.get("CRAWLER_SOURCE_DELAY", "0.8"))
SOURCE_TIMEOUT: float = float(os.environ.get("CRAWLER_SOURCE_TIMEOUT", "45"))

# ---- Firecrawl (lõi crawl chính cho trang HTML) ----
# Có CRAWLER_FIRECRAWL_API_KEY là bật: nguồn HTML (topcv, itviec) lấy qua /v2/scrape (1 credit/page cơ bản;
# `proxy: auto` chỉ tốn thêm 4 credits/page khi cần stealth). Nguồn JSON API
# (vietnamworks) chạy requests thuần, 0 credit. Không có key thì
# hành vi cũ (requests, không có lớp bypass).
FIRECRAWL_API_KEY: str | None = os.environ.get("CRAWLER_FIRECRAWL_API_KEY") or None
FIRECRAWL_URL: str = os.environ.get("CRAWLER_FIRECRAWL_URL", "https://api.firecrawl.dev/v2")
FIRECRAWL_CONCURRENCY: int = int(os.environ.get("CRAWLER_FIRECRAWL_CONCURRENCY", "2"))
FIRECRAWL_TIMEOUT_MS: int = int(os.environ.get("CRAWLER_FIRECRAWL_TIMEOUT_MS", "60000"))
FIRECRAWL_WAIT_MS: int = int(os.environ.get("CRAWLER_FIRECRAWL_WAIT_MS", "500"))
TOPCV_DETAIL_BATCH_SIZE: int = max(1, int(os.environ.get("CRAWLER_TOPCV_DETAIL_BATCH_SIZE", "8")))
ITVIEC_DETAIL_BATCH_SIZE: int = max(1, int(os.environ.get("CRAWLER_ITVIEC_DETAIL_BATCH_SIZE", "8")))
# 0 = luôn fetch fresh (Firecrawl mặc định cache 2 ngày, job phải tươi)
FIRECRAWL_MAXAGE_MS: int = int(os.environ.get("CRAWLER_FIRECRAWL_MAXAGE_MS", "0"))
# "auto" = thử basic (1 credit), chỉ lên enhanced (5 credits) khi cần né chặn
FIRECRAWL_PROXY: str = os.environ.get("CRAWLER_FIRECRAWL_PROXY", "auto")

DISABLED_SOURCES: set[str] = {
    s.strip() for s in os.environ.get("CRAWLER_DISABLE_SOURCES", "").split(",") if s.strip()
}

HEADERS_TEMPLATE: dict[str, str] = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
}
