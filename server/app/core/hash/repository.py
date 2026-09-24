from typing import List
from passlib.context import CryptContext
from abc import abstractmethod


class HashRepository:
    @abstractmethod
    def validate_hash(self, plain: str, encrypted: str) -> bool:
        raise NotImplementedError()

    @abstractmethod
    def create_hash(self, plain) -> str:
        raise NotImplementedError()


class PasslibRepository(HashRepository):
    def __init__(self, schemes: List[str]):
        self.context = CryptContext(schemes=schemes, deprecated="auto")

    def validate_hash(self, plain: str, encrypted: str) -> bool:
        return self.context.verify(plain, encrypted)

    def create_hash(self, plain) -> str:
        return self.context.hash(plain)
