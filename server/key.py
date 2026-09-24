from cryptography.fernet import Fernet
import secrets


def generate_key() -> str:
    return Fernet.generate_key().decode('utf-8')


if __name__ == "__main__":
    print(f'SECRET_KEY={secrets.token_hex(20)}')
    print(f'ENCRYPTION_KEY={generate_key()}')
