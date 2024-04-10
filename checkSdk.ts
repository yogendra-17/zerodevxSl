import path from 'path';
import * as sdk from  './srcMpc/lib/sdk'
import * as fs from 'fs';
import { promises  } from 'fs';
import * as prettier from 'prettier';
// import { utils } from 'ethers';
// import { keygen as keygen2 } from './configCheck.json';
async function main() {


    await sdk.initPairing();
    await sdk.runPairing();
    
    const keygen = await sdk.runKeygen();
    console.log(keygen);
    await sdk.runBackup();
    const CONFIG_PATH = path.join(__dirname, "config.json");
    fs.writeFile(
        CONFIG_PATH,
        await prettier.format(
            JSON.stringify({keygen }, null, 2),
            { parser: "json" }
        ),
        (err) => {
            if (err) {
                console.error(err);
            }
        }
    );
    await new Promise<void>(resolve => setTimeout(() => { 
        console.log("first timeout");
        resolve();
      }, 5000));
   
   console.log("keygenAbove", keygen.distributedKey.accountId, keygen.distributedKey.keyShareData);
  const data = await promises.readFile(CONFIG_PATH, 'utf8');
//   console.log("data",data)
  const keygen2 = JSON.parse(data);
//   console.log("keygen2",keygen2)
   console.log("keygenConfig", keygen2.keygen.distributedKey.accountId, keygen2.keygen.distributedKey.keyShareData);
    const signature = await sdk.runSign(
        "keccak256",
        "19457468657265756d205369676e6564204d6573736167653a0a33323905d344717efd562447a4960eea941c1244adc31f53525d0ec1397ff6951c9c",
        "83acef65a8bf089f817bd5af7b8a11215378b3fe875f7f7f8f63900b8ef92c6d",
        "eth_sign",
        keygen2.keygen.distributedKey.accountId,
        keygen2.keygen.distributedKey.keyShareData
        );
   console.log(signature);


}
main();