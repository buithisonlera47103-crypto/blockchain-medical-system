#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#

#
# This is a collection of bash functions used by different scripts
#

# default to using Org1
ORG=${1:-1}

# Exit on first error, print all commands.
set -e

# Where am I?
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

CHANNEL_NAME=${CHANNEL_NAME:-"mychannel"}
CC_NAME=${CC_NAME:-"basic"}
CC_SRC_PATH=${CC_SRC_PATH:-"../chaincode/fabcar/go/"}
CC_SRC_LANGUAGE=${CC_SRC_LANGUAGE:-"go"}
CC_VERSION=${CC_VERSION:-"1.0"}
CC_SEQUENCE=${CC_SEQUENCE:-"1"}
CC_INIT_FCN=${CC_INIT_FCN:-"NA"}
CC_END_POLICY=${CC_END_POLICY:-"NA"}
CC_COLL_CONFIG=${CC_COLL_CONFIG:-"NA"}
DELAY=${DELAY:-"3"}
MAX_RETRY=${MAX_RETRY:-"5"}
VERBOSE=${VERBOSE:-"false"}

# import utils
. scripts/envVar.sh

println() {
  echo -e "$1"
}

errorln() {
  println "${C_RED}${1}${C_RESET}"
}

successln() {
  println "${C_GREEN}${1}${C_RESET}"
}

infoln() {
  println "${C_BLUE}${1}${C_RESET}"
}

warnln() {
  println "${C_YELLOW}${1}${C_RESET}"
}

# Color variables
C_RESET='\033[0m' # No Color
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_BLUE='\033[0;34m'
C_YELLOW='\033[1;33m'

# timeout duration - the duration the CLI should wait for a response from
# another container before giving up
TIMEOUT="10s"
CLI_DELAY=${CLI_DELAY:-"3"}
# default for delay between commands
CLI_TIMEOUT=${CLI_TIMEOUT:-"10"}
# channel name defaults to "mychannel"
CHANNEL_NAME=${CHANNEL_NAME:-"mychannel"}
# chaincode name defaults to "basic"
CC_NAME=${CC_NAME:-"basic"}
# chaincode path defaults to "../chaincode/fabcar/go/"
CC_SRC_PATH=${CC_SRC_PATH:-"../chaincode/fabcar/go/"}
# endorsement policy defaults to "NA". This would allow chaincodes to use the majority default policy.
CC_END_POLICY=${CC_END_POLICY:-"NA"}
# collection configuration defaults to "NA"
CC_COLL_CONFIG=${CC_COLL_CONFIG:-"NA"}
# chaincode init function defaults to "NA"
CC_INIT_FCN=${CC_INIT_FCN:-"NA"}
# use this as the default docker-compose yaml definition
COMPOSE_FILE_BASE=compose/compose-test-net.yaml
# docker-compose.yaml file if you are using couchdb
COMPOSE_FILE_COUCH=compose/compose-couch.yaml
# certificate authorities compose file
COMPOSE_FILE_CA=compose/compose-ca.yaml
#
# use golang as the default language for chaincode
CC_SRC_LANGUAGE=${CC_SRC_LANGUAGE:-"go"}
# Chaincode version
CC_VERSION=${CC_VERSION:-"1.0"}
# Chaincode definition sequence
CC_SEQUENCE=${CC_SEQUENCE:-"1"}
# default image tag
IMAGETAG=${IMAGETAG:-"latest"}
# default ca image tag
CA_IMAGETAG=${CA_IMAGETAG:-"latest"}
# default database
DATABASE=${DATABASE:-"leveldb"}

# Parse commandline args

# print the usage message
function printHelp() {
  echo "Usage: "
  echo "  network.sh <Mode> [Flags]"
  echo "    <Mode>"
  echo "      - 'up' - bring up fabric orderer and peer nodes. No channel is created"
  echo "      - 'up createChannel' - bring up fabric network with one channel"
  echo "      - 'createChannel' - create and join a channel after the network is created"
  echo "      - 'deployCC' - deploy the fabcar chaincode on the channel"
  echo "      - 'down' - clear the network with docker-compose down"
  echo "      - 'restart' - restart the network"
  echo ""
  echo "    Flags:"
  echo "    -ca <use CAs> -  create Certificate Authorities to generate the crypto material"
  echo "    -c <channel name> - channel name to use (defaults to \"mychannel\")"
  echo "    -s <dbtype> - the database backend to use: goleveldb (default) or couchdb"
  echo "    -r <max retry> - CLI times out after certain number of attempts (defaults to 5)"
  echo "    -d <delay> - delay duration in seconds (defaults to 3)"
  echo "    -i <imagetag> - the tag to be used to launch the network (defaults to \"latest\")"
  echo "    -cai <ca_imagetag> - the image tag to be used for CA (defaults to \"${CA_IMAGETAG}\")"
  echo "    -verbose - verbose mode"
  echo "  network.sh -h (print this message)"
  echo ""
  echo "Typically, one would first generate the required certificates and "
  echo "genesis block, then bring up the network. e.g.:"
  echo ""
  echo "	network.sh up createChannel"
}
