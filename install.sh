#!/usr/bin/env bash
set -euo pipefail

PWD=$(pwd)

echo "Installing ATOSS CLI..."

LOCAL_JAR_FILE=$PWD/target/uberjar/atoss-cli-standalone.jar
INSTALL_DIR=/usr/local/bin/

if [ -f "$LOCAL_JAR_FILE" ]; then
    echo "Local uberjar exists, skipping pull from remote."
	cp -f $PWD/target/uberjar/atoss-cli-standalone.jar $INSTALL_DIR
else
    echo "$LOCAL_JAR_FILE does not exist, pulling release from Github."
	rm -f atoss-cli-standalone.jar
	gh release download latest
	mv -f atoss-cli-standalone.jar $INSTALL_DIR
fi

echo "Installing wrapper"

cp -f $PWD/wrapper.sh "${INSTALL_DIR}atoss-cli"

