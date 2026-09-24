import base64
import datetime
from json import JSONEncoder
from typing import List

from cryptography.fernet import Fernet


def encrypt_text(text: str, encryption_key: str) -> str:
    f = Fernet(encryption_key)
    encrypted = f.encrypt(text.encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_text(hashed_text: str, encryption_key: str) -> str:
    f = Fernet(encryption_key)
    decrypted = f.decrypt(hashed_text)
    return decrypted.decode("utf-8")


def encrypt_multiple_texts(texts: List[str], encryption_key: str) -> str:
    items = [encode_base64(text) for text in texts]
    items_str = " ".join(items)
    return encrypt_text(items_str, encryption_key)


def decrypt_multiple_texts(encrypted: str, encryption_key: str) -> List[str]:
    decrypted_str = decrypt_text(encrypted, encryption_key)
    items_encoded = decrypted_str.split(" ")
    return [decode_base64(encoded) for encoded in items_encoded]


def encode_base64(text: str) -> str:
    return base64.b64encode(bytes(text, "utf-8")).decode("utf-8")


def decode_base64(encoded: str) -> str:
    return base64.b64decode(encoded.encode("utf-8")).decode("utf-8")
