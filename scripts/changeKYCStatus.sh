#!/bin/sh
EMAIL=$1
KYC_STATUS=${2:-'verified'}
docker-compose exec mongo mongo localhost/ico-dashboard --eval "db.investor.findOneAndUpdate({ email: '${EMAIL}' }, { \$set: { kycStatus: '${KYC_STATUS}' } })"
