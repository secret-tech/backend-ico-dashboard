![](https://habrastorage.org/webt/59/d5/42/59d542206afbe280817420.png)

# Jincor ICO Dashboard Backend
This is backend module of Jincor ICO dashboard: https://contribute.jincor.com.

It was implemented to provide following functionality:
1. ICO investors sign up.
1. Generation of Ethereum address upon user activation.
1. KYC verification using Jumio Netverify service (https://www.jumio.com/trusted-identity/netverify).
1. Token purchase.
1. Displaying Investor's transaction history.
1. All important actions are protected with 2FA (email or google authenticator) by integration with Jincor Backend Verify service (https://github.com/JincorTech/backend-verify)
1. For more info check API docs: https://jincortech.github.io/backend-ico-dashboard

## Technology stack

1. Typescript, Express, InversifyJS (DI), TypeORM (MongoDB interaction).
1. Web3JS - interaction with Ethereum client. ICO backend supports any JSON-RPC compliant client.
1. Mocha/chai - unit/functional tests.
1. Docker.

## How to start development and run tests?

1. Clone this repo.
1. Run `docker-compose build --no-cache`.
1. Run `docker-compose up -d`.
1. Run `cp .env.test .env`.
1. To install dependencies run `docker-compose exec ico yarn`.
1. Run tests `docker-compose exec ico yarn test`.

## How to generate docs?

1. Install aglio `npm install -g aglio`.
1. Run `mkdir /usr/local/lib/node_modules/aglio/node_modules/aglio-theme-olio/cache`.
1. Generate `aglio --theme-variables cyborg --theme-template triple -i apiary.apib -o ./docs/index.html`.


## How to launch the project?

### Getting Started

1. Clone the repo.
2. Write the necessary environment variables in `.env`. For a basis it is possible to take `.env.stage` or `.env.prod`.
3. Build services `docker-compose build --no-cache`
4. Run the services `docker-compose up -d`

  > Note: The [auth](https://github.com/JincorTech/backend-auth) and [verify](https://github.com/JincorTech/backend-verify) services should be accessible from the outside. More in detail with the configuration of these services can be found in their readme.

### Building the Application

1. Install dependencies and build the project `docker-compose exec ico npm i && docker-compose exec ico npm run build`
2. Generate a token for a tenant:

  ```
  curl --include \
       --request POST \
       --header "Content-Type: application/json" \
       --header "Accept: application/json" \
       --data-binary "{
      \"email\": \"test@test.com\",
      \"password\": \"Password1\"
  }" \
  'http://auth:3000/tenant'
  ```

  ```
  curl --include \
       --request POST \
       --header "Content-Type: application/json" \
       --header "Accept: application/json" \
       --data-binary "{
      \"email\": \"test@test.com\",
      \"password\": \"Password1\"
  }" \
  'http://auth:3000/tenant/login'
  ```

  > Note: If you start it in ico service, you must install `curl`. This can be done with the `apk add curl` command.

3. Specify the received token in `.env` `AUTH_JWT`.
4. Copy the certificates to the `dist/certs` directory.
5. Rename or delete the `src` directory.

  > Note: If the test environment is deployed and `.env.test` is used, files from `src` will be used.

6. Run ico service:

  `npm run serve`

  > Note: If the dev environment, will run `npm run start` command.

## Other

For set kycVerify into verified status use bash script `changeKYCStatus.sh` as `changeKYCStatus.sh [email] [status]`, where the  `status` option default value is `verified`.

## Email

[How to configure email notifications](src/emails/README.md)