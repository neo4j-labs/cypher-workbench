#!/bin/bash
echo "Creating nginx.conf file"
# environment variables should be set in envConfig.sh   
#envsubst '${GRAPHQL_PROTOCOL} ${GRAPHQL_PORT} ${GRAPHQL_HOST}' < ./cw-config/cw-ui-nginx-template/nginx.conf.template > ./cw-config/cw-ui-nginx/nginx.conf
#using sed three times instead of envsubst because envsubst not available on mac by default
sed 's|${GRAPHQL_PROTOCOL}|'$GRAPHQL_PROTOCOL'|g' $PWD/cw-config/cw-ui-nginx-template/nginx.conf.template > $PWD/cw-config/cw-ui-nginx/nginx.conf.1
sed 's|${GRAPHQL_HOST}|'$GRAPHQL_HOST'|g' $PWD/cw-config/cw-ui-nginx/nginx.conf.1 > $PWD/cw-config/cw-ui-nginx/nginx.conf.2
sed 's|${GRAPHQL_PORT}|'$GRAPHQL_PORT'|g' $PWD/cw-config/cw-ui-nginx/nginx.conf.2 > $PWD/cw-config/cw-ui-nginx/nginx.conf
rm $PWD/cw-config/cw-ui-nginx/nginx.conf.1
rm $PWD/cw-config/cw-ui-nginx/nginx.conf.2