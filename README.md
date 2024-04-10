# ZeroDev Examples

## Setup and Installation

Copy the `.env.example` file to `.env` and fill in the required values (most examples only require a few of these env vars)

Step to reproduce the error:

  ```bash
   npm install
   npx ts-node create-account/without-preset.ts
```

**Install dependencies**

Navigate to the project directory and install the dependencies:

   ```bash
   cd zerodev-examples
   npm install
```

**Setup environment variables**

Copy the `.env.example` file to `.env` and fill in the required values (most examples only require a few of these env vars)

   ```bash
    cp .env.example .env
   ```

Run the script**
Run the script using the following command:
   ```bash
   npx ts-node create-account/without-preset.ts
   ```

## Error Details

```bash
Error Message:
SendUserOperationError: RPC Request failed.
URL: https://rpc.zerodev.app/api/v2/bundler/...
Details: Invalid UserOp signature or paymaster signature
```
