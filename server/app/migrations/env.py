from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from app.models.base import Base
import app.models  # noqa: F401 — register models for autogenerate
from app.settings import get_settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.get_database_url())

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

UNMANAGED_TABLES = []
POSTGIS_TABLES = [
    'spatial_ref_sys',
    'pagc_rules',
    'zip_lookup_base',
    'direction_lookup',
    'bg',
    'loader_platform',
    'loader_variables',
    'place',
    'secondary_unit_lookup',
    'tabblock',
    'addrfeat',
    'state_lookup',
    'faces',
    'zcta5',
    'geocode_settings',
    'tract',
    'pagc_gaz',
    'street_type_lookup',
    'layer',
    'state',
    'addr',
    'featnames',
    'cousub',
    'place_lookup',
    'pagc_lex',
    'topology',
    'geocode_settings_default',
    'loader_lookuptables',
    'county_lookup',
    'county',
    'zip_lookup',
    'tabblock20',
    'edges',
    'zip_state',
    'countysub_lookup',
    'zip_state_loc',
    'zip_lookup_all',
]

IGNORE_TABLES = UNMANAGED_TABLES + POSTGIS_TABLES


def include_object(object, name, type_, reflected, compare_to):
    if type_ == 'table' and (name in IGNORE_TABLES or object.info.get("skip_autogenerate", False)):
        return False

    elif type_ == "column" and object.info.get("skip_autogenerate", False):
        return False

    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
