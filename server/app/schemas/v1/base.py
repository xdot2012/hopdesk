from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from humps import camelize

PasswordField = Field(min_length=8)

def to_camelcase(string):
    return camelize(string)


class RequestBaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class ResponseBaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camelcase,
        populate_by_name=True,
    )
