#!/bin/sh

# make directories
mkdir -p public/remixicon
mkdir -p public/bootstrap

# build outputs
npx tsc
sed -e "s/%%version%%/$(date +%s)/" src/sw.js > public/sw.js
cp -a node_modules/remixicon/fonts/* public/remixicon
cp -a node_modules/bootstrap/dist/css/bootstrap.min.css public/bootstrap/bootstrap.min.css
cp -a node_modules/bootstrap/dist/js/bootstrap.bundle.min.js public/bootstrap/bootstrap.bundle.min.js