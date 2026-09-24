from .repository import HashRepository


class HashService:
    def __init__(self, hash_repository: HashRepository):
        self.hash_repository = hash_repository

    def validate_hash(self, plain: str, encrypted: str) -> bool:
        return self.hash_repository.validate_hash(plain=plain, encrypted=encrypted)

    def create_hash(self, plain) -> str:
        return self.hash_repository.create_hash(plain=plain)

