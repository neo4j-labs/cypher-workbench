#!/bin/bash
echo "Creating nginx.conf file"
# environment variables should be set in envConfig.sh   
#envsubst '${GRAPHQL_PROTOCOL} ${GRAPHQL_PORT} ${GRAPHQL_HOST}' < ./sw-config/sw-ui-nginx-template/nginx.conf.template > ./sw-config/sw-ui-nginx/nginx.conf
#using sed three times instead of envsubst because envsubst not available on mac by default
sed 's|${GRAPHQL_PROTOCOL}|'$GRAPHQL_PROTOCOL'|g' $PWD/sw-config/sw-ui-nginx-template/nginx.conf.template > $PWD/sw-config/sw-ui-nginx/nginx.conf.1
sed 's|${GRAPHQL_HOST}|'$GRAPHQL_HOST'|g' $PWD/sw-config/sw-ui-nginx/nginx.conf.1 > $PWD/sw-config/sw-ui-nginx/nginx.conf.2
sed 's|${GRAPHQL_PORT}|'$GRAPHQL_PORT'|g' $PWD/sw-config/sw-ui-nginx/nginx.conf.2 > $PWD/sw-config/sw-ui-nginx/nginx.conf
rm $PWD/sw-config/sw-ui-nginx/nginx.conf.1
rm $PWD/sw-config/sw-ui-nginx/nginx.conf.2