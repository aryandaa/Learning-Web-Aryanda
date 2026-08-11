from Crypto.Util.number import *

ciphertext = 11515195063862318899931685488813747395775516287289682636499965282714637259206269

plaintext = long_to_bytes(ciphertext).decode()
print(plaintext)