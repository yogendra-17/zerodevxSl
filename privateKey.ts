import { randomBytes } from 'crypto';

// Function to generate a random private key in hex format
function generatePrivateKeyHex(): string {
    // Generate 32 random bytes
    const privateKeyBytes = randomBytes(32);
    // Convert the bytes to a hexadecimal string
    const privateKeyHex = privateKeyBytes.toString('hex');
    return privateKeyHex;
}

// Generate a random private key in hex format
const privateKey = generatePrivateKeyHex();

// Print the generated private key
console.log("Generated Private Key (Hex):", privateKey);
