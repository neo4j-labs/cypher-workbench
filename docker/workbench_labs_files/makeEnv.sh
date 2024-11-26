#!/bin/sh
cat /dev/null > .env

echo "Creating docker-compose .env file"

# variables are defined in envConfig.sh
echo "WORKBENCH_PROTOCOL=$WORKBENCH_PROTOCOL" >> .env
echo "WORKBENCH_HOST=$WORKBENCH_HOST" >> .env
echo "WORKBENCH_PORT_EXTERNAL=$WORKBENCH_PORT_EXTERNAL" >> .env
echo "WORKBENCH_PORT_INTERNAL=$WORKBENCH_PORT_INTERNAL" >> .env
echo "GRAPHQL_PROTOCOL=$GRAPHQL_PROTOCOL" >> .env
echo "GRAPHQL_HOST=$GRAPHQL_HOST" >> .env
echo "GRAPHQL_PORT=$GRAPHQL_PORT" >> .env
