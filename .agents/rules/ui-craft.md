---
trigger: always_on
description: Modern Tactile Tabletop UI Craft guidelines for ULTA web application — eliminates generic AI slop and enforces crafted board-game visual hierarchy.
---

# UI Craft Rule: Modern Tactile Tabletop (ULTA)

Seluruh halaman dan komponen di `/client` wajib mematuhi panduan desain **Modern Tactile Tabletop** (terinspirasi board game premium seperti Catan/Ludo modern dan game edukasi editorial):

## 1. Larangan Anti–AI Slop
- **DILARANG** menggunakan gradasi ungu/biru/fuchsia neon generik (seperti `from-indigo-600 via-violet-600 to-fuchsia-600` atau `from-orange-500 via-rose-500 to-pink-500`).
- **DILARANG** menggunakan glassmorphism/blur berlebihan (`backdrop-blur-md`, lingkaran blur dekoratif `blur-2xl`, transparansi berlapis yang keruh).
- **DILARANG** menumpuk kartu seragam putih dengan `shadow-xl` generik berat; gunakan permukaan kertas/linen hangat dengan garis tepi tegas dan bayangan offset papan yang tipis & taktil.
- **DILARANG** menggunakan emoji sebagai ikon UI. Seluruh ikon wajib memakai ikon SVG **Lucide React** yang tajam dan konsisten.

## 2. Sistem Warna Terkurasi (Warm Tabletop Palette)
- **Kanvas Halaman**: Kertas hangat bersih `#FAF6EE` dengan tekstur halus (tanpa blob neon).
- **Permukaan Kartu & Panel**: Ivory bersih `#FFFDF8` dengan border stone hangat `#DDD2C0` dan aksen tepi taktil `#D1C4AE`.
- **Tinta Tipografi**: Deep espresso `#1F1B17` (utama) dan warm umber `#645A4E` (sekunder).
- **Aksen Semantik Papan**:
  - **Tangga (`LADDER`)**: Hijau sage / forest emerald (`#2F7D57`, tint `#E6F2EB`, rel kayu `#9B6B3F`).
  - **Ular (`SNAKE`)**: Terracotta / coral hangat (`#C8523B`, tint `#FCEBE7`, variasi earthy tabletop).
  - **Petak Soal (`QUESTION`)**: Kuning mustard / marigold (`#B7791F`, tint `#FDF3D7`, border `#E5C068`).
  - **Bingkai Papan**: Kayu walnut hangat (`#4B3624`) dengan lis krem (`#E5D7BE`).
  - **5 Pion Pemain**: Warna kontras tinggi bergaya token kayu modern (Vermilion `#D6453A`, Cobalt `#2B6CB0`, Forest `#2F855A`, Plum `#7B4B94`, Ochre `#C9821E`).

## 3. Tipografi Berkarakter
- **Display & Nomor Petak**: `Bricolage Grotesque` (tegas, editorial, mudah dibaca di petak kecil).
- **Teks UI & Soal Kuis**: `Plus Jakarta Sans` (bersih, kontras tinggi).
- **Kode Room & Timer**: `JetBrains Mono` (tabular/monospaced agar angka timer tidak melompat).

## 4. Hierarki Visual & Keterbacaan Papan
- Di halaman **Arena**, Papan 10×10 adalah pusat perhatian utama (mendominasi ruang desktop `lg:col-span-8` dan lebar penuh di mobile).
- Panel dadu, daftar pemain, dan log kejadian ditata ringkas, terstruktur, dan tenang agar fokus tetap di papan.
- Overlay SVG tangga & ular wajib proporsional, tidak menutupi nomor petak, dan menyediakan efek sorot halus (highlight) saat diarahkan kursor atau saat pion mendarat di petak terkait.
- Komponen papan React wajib dinamis merender berapa pun jumlah ular/tangga/soal yang dikirim oleh server Python (authoritative server).
