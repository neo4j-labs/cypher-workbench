#!/bin/sh
echo "Setting WORKBENCH_PROTOCOL, WORKBENCH_HOST, WORKBENCH_PORT_EXTERNAL, WORKBENCH_PORT_INTERNAL, GRAPHQL_PROTOCOL, GRAPHQL_HOST, and GRAPHQL_PORT - modify envConfig.sh to change"

WORKBENCH_PROTOCOL=http
WORKBENCH_HOST=localhost
WORKBENCH_PORT_EXTERNAL=80
WORKBENCH_PORT_INTERNAL=80

# for accessing graphql via react-ui-hostname/graphql via configured nginx proxy
#   use the internal docker-compose networking names and ports
GRAPHQL_PROTOCOL=http
GRAPHQL_HOST=solutions-workbench-api
GRAPHQL_PORT=4000

export WORKBENCH_PROTOCOL
export WORKBENCH_HOST
export WORKBENCH_PORT_EXTERNAL
export WORKBENCH_PORT_INTERNAL
export GRAPHQL_PROTOCOL
export GRAPHQL_HOST
export GRAPHQL_PORT