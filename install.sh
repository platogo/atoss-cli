#!/usr/bin/env bash
set -euo pipefail

PWD=$(pwd)

echo "Installing ATOSS CLI..."

LATEST_REL_URL="https://github.com/platogo/atoss-cli/releases/download/latest/atoss-cli-standalone.jar"
LOCAL_JAR_FILE=$PWD/target/uberjar/atoss-cli-standalone.jar

if [ -f "$LOCAL_JAR_FILE" ]; then
    echo "Local uberjar exists, skipping pull from remote."
	cp -f $PWD/target/uberjar/atoss-cli-standalone.jar /usr/local/bin/
else
    echo "$LOCAL_JAR_FILE does not exist, pulling release from Github."
	curl -L $LATEST_REL_URL > atoss-cli-standalone.jar
	mv -f atoss-cli-standalone.jar /usr/local/bin/
fi

echo "Installing wrapper"

cp -f $PWD/wrapper.sh "/usr/local/bin/atoss-cli"

