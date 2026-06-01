"""Security primitives: password hashing and JWT."""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

_settings = get_settings()
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    exp = _now() + timedelta(minutes=_settings.jwt_access_ttl_min)
    payload = {"sub": subject, "exp": exp, "iat": _now(), "type": "access"}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _settings.jwt_secret, algorithm=_settings.jwt_alg)


def create_refresh_token(subject: str) -> str:
    exp = _now() + timedelta(days=_settings.jwt_refresh_ttl_days)
    payload = {"sub": subject, "exp": exp, "iat": _now(), "type": "refresh"}
    return jwt.encode(payload, _settings.jwt_secret, algorithm=_settings.jwt_alg)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, _settings.jwt_secret, algorithms=[_settings.jwt_alg])
    except JWTError as exc:
        raise ValueError(f"invalid token: {exc}") from exc
