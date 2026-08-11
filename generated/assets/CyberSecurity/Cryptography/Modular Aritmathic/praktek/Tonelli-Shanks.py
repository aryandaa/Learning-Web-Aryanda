a = 8479994658316772151941616510097127087554541274812435112009425778595495359700244470400642403747058566807127814165396640215844192327900454116257979487432016769329970767046735091249898678088061634796559556704959846424131820416048436501387617211770124292793308079214153179977624440438616958575058361193975686620046439877308339989295604537867493683872778843921771307305602776398786978353866231661453376056771972069776398999013769588936194859344941268223184197231368887060609212875507518936172060702209557124430477137421847130682601666968691651447236917018634902407704797328509461854842432015009878011354022108661461024768
p = 30531851861994333252675935111487950694414332763909083514133769861350960895076504687261369815735742549428789138300843082086550059082835141454526618160634109969195486322015775943030060449557090064811940139431735209185996454739163555910726493597222646855506445602953689527405362207926990442391705014604777038685880527537489845359101552442292804398472642356609304810680731556542002301547846635101455995732584071355903010856718680732337369128498655255277003643669031694516851390505923416710601212618443109844041514942401969629158975457079026906304328749039997262960301209158175920051890620947063936347307238412281568760161
p1 = p-1

# step 1 : Faktorisasi Bagian Genap dari (p - 1)
# Menjadikan Bilangan Genap
q = p
q -= 1

# Mencari S dan Q
s = 0
while q %2 == 0:
    q = q // 2
    s +=1

# Step 2 Cari Z^p-2/1 = -1 (mod p) dan c = z^Q mod p
for z in range(2, p):
    if pow(z, (p - 1) // 2, p) == p - 1:  # p - 1 itu sama dengan -1 mod p
        print(f"Nilai z yang ditemukan: {z}")
        break 
c = pow(z, q, p)

# step 3 Inisialisasi Variabel Pelacak
R = pow(a, (q + 1) // 2, p)
t = pow (a, q, p)
m = s

# Step 4: Perulangan (Looping) untuk Memperbaiki Nilai
if t == 1:
    print(f"Nilai R: {R}")
elif t == 0:
    print("Akarnya adalah 0")
else:
    # Masuk ke perulangan utama selama t tidak sama dengan 1
    while t != 1:
        # Step 4a: Cari Nilai i terkecil (0 < i < m) sedemikian rupa t^(2^i) == 1 mod p
        i = 0
        faktor_t = t
        # Lakukan perulangan untuk mengkuadratkan t secara berturut-turut
        while faktor_t != 1 and i < m:
            i += 1
            faktor_t = pow(faktor_t, 2, p)

        # Jika i sama dengan m, berarti 'a' bukan sisa kuadrat (tidak ada akar)
        if i == m:
            print("a bukan sisa kuadrat (tidak memiliki akar kuadrat modular)")
            break

        # Step 4b: Hitung Nilai b
        # Menggunakan 2 ** (m - i - 1) sebagai eksponen langsung
        pangkat_b = 2 ** (m - i - 1)
        b = pow(c, pangkat_b, p)

        # Step 4c: Perbaiki Nilai R, t, c, dan m
        R = (R * b) % p
        t = (t * pow(b, 2, p)) % p
        c = pow(b, 2, p)
        m = i

    # Cetak hasil jika loop selesai dengan sukses (t == 1)
    if t == 1:
        print(f"Nilai R (Akar 1): {R}")
        print(f"Nilai p - R (Akar 2): {p - R}")