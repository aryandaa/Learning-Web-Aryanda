from pwn import xor

# Step 1: mencari K2 dengan cara XOR K1 dengan K2xorK1
K1 = bytes.fromhex("a6c8b6733c9b22de7bc0253266a3867df55acde8635e19c73313")
K2xorK1 = bytes.fromhex("37dcb292030faa90d07eec17e3b1c6d8daf94c35d4c9191a5e1e")

# Step 2: mencari K3 dengan cara XOR K2 dengan K2xorK3
K2 = xor(K1,K2xorK1)
K2xorK3 = bytes.fromhex("c1545756687e7573db23aa1c3452a098b71a7fbf0fddddde5fc1")

# Step 3: mencari Flag dengan cara XOR FlagxorAll dengan XOR K1, K2, dan K3
K3 = xor(K2, K2xorK3)
FlagxorAll = bytes.fromhex("04ee9855208a2cd59091d04767ae47963170d1660df7f56f5faf")

# Step 4: XOR FlagxorAll dengan XOR K1, K2, dan K3 untuk mendapatkan Flag
Flag = xor(FlagxorAll, K1, K2, K3)
print(Flag.decode())