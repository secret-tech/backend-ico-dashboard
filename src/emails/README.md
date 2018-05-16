# Configure email notifications

The project uses the required and optional templates.

The body of the template.

```typescript
export const render = (data) => `<template>${data.fieldName}</template>`;
```

## Required templates
### init-buy-tokens.
Params:
- data.name (String) - recipient name
- data.ip (String) - request ip
- data.datetime (String) - request date-time
- {{{CODE}}} - verification code

### init-change-password
Params:
- data.name (String) - recipient name
- data.ip (String) - request ip
- data.datetime (String) - request date-time
- {{{CODE}}} - verification code

### init-reset-password
Params:
- data.name (String) - recipient name
- data.ip (String) - request ip
- data.datetime (String) - request date-time
- {{{CODE}}} - verification code

### init-signin
Params:
- data.name (String) - recipient name
- data.ip (String) - request ip
- data.datetime (String) - request date-time
- {{{CODE}}} - verification code

### init-signup
Params:
- data.name (String) - recipient name
- data.link (String) - activation link
- {{{CODE}}} - verification code

### invite
Params:
- data.referralName (String) - referral name
- data.link (String) - referral link


## Optional templates
### success-signin
Params:
- data.name (String) - recipient name
- data.datetime (String) - request date-time

### success-signup
Params:
- data.name (String) - recipient name

### success-password-change
Params:
- data.name (String) - recipient name

### success-password-reset
Params:
- data.name (String) - recipient name