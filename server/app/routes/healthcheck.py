from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/")
def healthcheck():
    return
