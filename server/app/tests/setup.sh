#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd "$parent_path"

rm ./db/test.db
touch ./db/test.db
rm -r ./db/versions
mkdir ./db/versions
alembic revision --autogenerate
alembic upgrade head
