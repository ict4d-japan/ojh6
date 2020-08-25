# A demo Video chat app using Vue.js

## Prerequisite

To run this project, you need to have:

- [Node.js](https://nodejs.org/) installed on your system
- A server for generating a token. Clone and install it [here](https://github.com/dongido001/TwilioNodeServer.git).

## Setup

Clone the repository:

``` bash
 git clone https://github.com/dongido001/VueVideoChat.git
```

cd into the project:
``` bash
cd VueVideoChat
```

Install dependencies:

``` bash
npm install
```

Run the app!

``` bash
npm run dev
```

The app should now be accessible from http://localhost:8080

And that's it. You can read more about how it was built [here](https://blog.twilio.com)

## Deploy video chat app using the Twilio Runtime

Install the Twilio CLI:
``` bash
npm install twilio-cli -g
```

Login to your Twilio account using your Account SID and Auth Token:
``` bash
twilio login  
```

Install the RTC plugin:
``` bash
twilio plugins:install @twilio-labs/plugin-rtc
```

Deploy!
``` bash
npm run deploy:twilio-cli
```
