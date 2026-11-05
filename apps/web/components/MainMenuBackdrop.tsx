import type { SVGProps } from "react";

/** A light, scalable 2D scene illustration for the boot menu. */
export default function MainMenuBackdrop(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"
      role="img" aria-label="A dim alien industrial site with a working factory and an official production mural"
      {...props}>
      <defs>
        <linearGradient id="uy-menu-sky" x2="0" y2="1">
          <stop stopColor="#101b23"/><stop offset=".55" stopColor="#26333a"/>
          <stop offset="1" stopColor="#74614c"/>
        </linearGradient>
        <linearGradient id="uy-menu-ground" x2="0" y2="1">
          <stop stopColor="#6a5541"/><stop offset=".42" stopColor="#302c27"/>
          <stop offset="1" stopColor="#171c1b"/>
        </linearGradient>
        <linearGradient id="uy-menu-steel" x2="0" y2="1">
          <stop stopColor="#59605b"/><stop offset=".3" stopColor="#343d3a"/>
          <stop offset="1" stopColor="#151e20"/>
        </linearGradient>
        <linearGradient id="uy-menu-roof" x2="1" y2="1">
          <stop stopColor="#68706a"/><stop offset=".55" stopColor="#414945"/>
          <stop offset="1" stopColor="#222b2b"/>
        </linearGradient>
        <linearGradient id="uy-menu-poster" x2="0" y2="1">
          <stop stopColor="#e1c28a"/><stop offset="1" stopColor="#a85f36"/>
        </linearGradient>
        <linearGradient id="uy-menu-pipe" x2="0" y2="1">
          <stop stopColor="#8b8a77"/><stop offset=".24" stopColor="#4f5a55"/>
          <stop offset=".72" stopColor="#273238"/><stop offset="1" stopColor="#11191c"/>
        </linearGradient>
        <radialGradient id="uy-menu-planet">
          <stop stopColor="#d2c6a8"/><stop offset=".72" stopColor="#8d8d81"/>
          <stop offset="1" stopColor="#4d5a5a"/>
        </radialGradient>
        <radialGradient id="uy-menu-glow">
          <stop stopColor="#ffc77c" stopOpacity=".9"/><stop offset="1" stopColor="#e68b3e" stopOpacity="0"/>
        </radialGradient>
        <pattern id="uy-menu-grain" width="38" height="38" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="7" r="1" fill="#e7d2a6" opacity=".14"/>
          <circle cx="26" cy="22" r=".8" fill="#e7d2a6" opacity=".1"/>
          <path d="M12 33h5" stroke="#e7d2a6" strokeOpacity=".08"/>
        </pattern>
        <filter id="uy-menu-soft-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="16"/>
        </filter>
      </defs>
      <rect width="1600" height="900" fill="url(#uy-menu-sky)"/>
      <g fill="#d9d3bd" opacity=".5">
        <circle cx="164" cy="116" r="1.4"/><circle cx="315" cy="83" r="1"/>
        <circle cx="492" cy="164" r="1.2"/><circle cx="690" cy="77" r="1.1"/>
        <circle cx="1025" cy="94" r="1.4"/><circle cx="1196" cy="66" r="1"/>
        <circle cx="1450" cy="166" r="1.2"/><circle cx="1530" cy="88" r="1"/>
      </g>
      <circle cx="1330" cy="190" r="152" fill="#c5c0a9" opacity=".12"/>
      <circle cx="1330" cy="190" r="137" fill="url(#uy-menu-planet)"/>
      <path d="M1214 116q74-55 165-13t69 91q-54-35-103-10t-131-7z" fill="#6d7771" opacity=".32"/>
      <path d="M1211 220q75-39 143 4t112 8q-56 79-150 68t-105-80z" fill="#6e756e" opacity=".4"/>
      <path d="M0 442 120 366l82 36 123-119 116 97 92-57 125 103 116-87 115 104 113-71 115 70 114-100 106 97 109-74 124 95v220H0z" fill="#343b3a"/>
      <path d="m0 489 144-84 106 64 130-96 125 86 117-43 118 88 121-62 125 68 128-96 117 91 106-62 163 103v174H0z" fill="#4d4a40" opacity=".8"/>
      <path d="M0 545q190-67 350-14t314-8q164-47 330 3t325-2q151-37 281 11v365H0z" fill="url(#uy-menu-ground)"/>
      <path d="M0 638q170-49 340-5t322-9q193-52 370 0t345-1q125-26 223 7v270H0z" fill="#252b29"/>
      <g opacity=".42" fill="#a07b54">
        <path d="m80 600 74-31 58 19-46 35z"/><path d="m330 670 86-24 62 31-83 23z"/>
        <path d="m980 596 94-29 74 26-83 33z"/><path d="m1390 642 101-38 71 34-96 40z"/>
      </g>
      {/* Distant extraction rigs */}
      <g fill="none" stroke="#202b2c" strokeWidth="13" opacity=".85">
        <path d="M640 493V295h64v198M650 326h44M650 365h44M650 404h44"/>
        <path d="M622 295h100M650 295l24-43 24 43M676 252v-35"/>
        <path d="M748 496V350h48v146M740 350h64M752 384h40M752 420h40"/>
      </g>
      <g fill="#b87b48" opacity=".65">
        <rect x="660" y="333" width="9" height="13"/><rect x="681" y="372" width="9" height="13"/>
        <rect x="763" y="391" width="8" height="11"/>
      </g>
      {/* Central factory silhouette */}
      <g>
        <path d="M740 565V397l113-71 97 42 0 197z" fill="#202a2a"/>
        <path d="m740 397 113-71 97 42-111 77z" fill="url(#uy-menu-roof)"/>
        <path d="m839 445 111-77v197l-111 78z" fill="#293332"/>
        <path d="M740 397h111v246H740z" fill="url(#uy-menu-steel)"/>
        <path d="M758 427h72v10h-72zM758 454h72v7h-72z" fill="#a4a28c" opacity=".45"/>
        <path d="M763 491h34v88h-34zM809 491h24v88h-24z" fill="#121c1f"/>
        <path d="M768 497h24v73h-24zM814 497h14v73h-14z" fill="#d58a48" opacity=".58"/>
        <path d="M751 397v-22h94v22" fill="#414a46" stroke="#9c9b83" strokeOpacity=".3"/>
        <path d="M775 375v-92h24v92M782 283v-43h10v43" fill="#303a39"/>
        <path d="M772 240h31v9h-31z" fill="#8c8875"/>
        <path d="M785 225q-22-34 5-55 31-22 13-53 39 35 8 70 20 17-4 39" fill="#a7a59a" opacity=".12"/>
      </g>
      {/* Right-side assembly hall */}
      <g>
        <path d="M990 595V337l188-92 190 79v271z" fill="#26302f"/>
        <path d="m990 337 188-92 190 79-190 103z" fill="url(#uy-menu-roof)"/>
        <path d="m1178 427 190-103v271l-190 91z" fill="#1b2527"/>
        <path d="M990 337h188v258H990z" fill="url(#uy-menu-steel)"/>
        <path d="M1010 362h148v10h-148z" fill="#9d9d85" opacity=".35"/>
        <path d="M1014 398h144v8h-144zM1014 414h144v5h-144z" fill="#a9a58c" opacity=".22"/>
        <g fill="#182224" stroke="#8d8c78" strokeOpacity=".28" strokeWidth="2">
          <rect x="1014" y="451" width="48" height="84"/><rect x="1077" y="451" width="48" height="84"/>
          <rect x="1139" y="451" width="28" height="84"/>
        </g>
        <g fill="#d48a4a" opacity=".55">
          <rect x="1020" y="457" width="36" height="70"/><rect x="1083" y="457" width="36" height="70"/>
          <rect x="1144" y="457" width="18" height="70"/>
        </g>
        <path d="M1024 337V214h28v123M1016 214h44M1029 194h17v20" fill="#303a39"/>
        <path d="M1081 307V178h20v129M1075 178h32M1085 157h14v21" fill="#39433e"/>
        <path d="M1232 349V202h34v147M1223 202h52M1240 178h17v24" fill="#303a39"/>
        <path d="M1238 170q-22-34 3-56 22-22 8-45 34 28 14 60 13 21-7 42" fill="#c5bca5" opacity=".12"/>
      </g>
      {/* Official production mural integrated into the hall wall */}
      <g transform="translate(1200 372)">
        <path d="M0 0 137-73l113 47-137 76z" fill="#111a1c" opacity=".7"/>
        <path d="m10-8 125-67 101 42-126 68z" fill="url(#uy-menu-poster)" stroke="#d8c29b" strokeWidth="5"/>
        <path d="m28-9 90-48 77 32-91 49z" fill="#b46d43" opacity=".5"/>
        <circle cx="130" cy="-37" r="27" fill="#e4c58b" opacity=".8"/>
        <path d="M130-74v74M93-37h74M104-63l52 52M156-63l-52 52" stroke="#75452e" strokeWidth="3" opacity=".6"/>
        <path d="M45 7q15-34 45-37 23 1 36 26l-5 19H39z" fill="#293638"/>
        <path d="M71-34q-5-19 12-28 20-6 31 11l-3 21-20 8z" fill="#d6b98b"/>
        <path d="M77-42q-5-24 15-31 21 4 25 22l-10-8-17 6z" fill="#333b3a"/>
        <path d="M53 1 79-12l26 6 21 26H47z" fill="#34403d"/>
        <path d="M18 24h196" stroke="#5e402d" strokeWidth="3"/>
        <path d="M17-6 137-70" stroke="#f1d7a2" strokeWidth="2" opacity=".5"/>
      </g>
      {/* Freight conveyor and transfer bridge */}
      <g>
        <path d="M680 571 1015 650l-20 35-347-84z" fill="#111a1c"/>
        <path d="m674 562 340 80-10 18-341-80z" fill="#59615a"/>
        <path d="m678 563 335 79" stroke="#c1aa79" strokeWidth="3" strokeDasharray="18 13" opacity=".55"/>
        <g stroke="#202a2a" strokeWidth="8">
          <path d="M715 579v71M805 599v73M902 621v65M985 642v53"/>
        </g>
      </g>
      {/* Freight pipe across foreground */}
      <g>
        <ellipse cx="1065" cy="744" rx="590" ry="38" fill="#090f12" opacity=".7"/>
        <path d="M585 693 1595 735v78L585 772z" fill="url(#uy-menu-pipe)" stroke="#11191c" strokeWidth="9"/>
        <path d="m585 703 1010 42" stroke="#a5a18a" strokeWidth="7" opacity=".42"/>
        <path d="m585 762 1010 43" stroke="#090f12" strokeWidth="9"/>
        <g stroke="#8d907f" strokeWidth="6" opacity=".65">
          <path d="M710 698v79M728 700v80M990 710v81M1008 711v82M1290 722v83M1308 723v83M1515 732v82M1533 733v82"/>
        </g>
        <g fill="#b77a43">
          <rect x="703" y="712" width="32" height="9" rx="2"/><rect x="983" y="724" width="32" height="9" rx="2"/>
          <rect x="1283" y="736" width="32" height="9" rx="2"/><rect x="1508" y="746" width="32" height="9" rx="2"/>
        </g>
      </g>
      {/* Terminal and loading gantry */}
      <g>
        <path d="M1354 600V423h155v177z" fill="#202b2c" stroke="#11191b" strokeWidth="8"/>
        <path d="m1354 423 77-43 78 43-77 42z" fill="#59615a"/>
        <path d="M1372 449h118v8h-118z" fill="#c18a50"/>
        <path d="M1380 478h103v76h-103z" fill="#111c20" stroke="#778071" strokeWidth="3"/>
        <path d="M1390 489h83v6h-83zM1390 505h61v4h-61z" fill="#9fb18b" opacity=".7"/>
        <circle cx="1465" cy="531" r="5" fill="#d99551"/>
        <path d="M1420 379V261h20v118M1400 261h60M1430 238v23" stroke="#3a4542" strokeWidth="12" fill="none"/>
        <path d="M1399 261h65" stroke="#bd8a53" strokeWidth="4"/>
        <path d="M1408 275v72M1454 275v72" stroke="#7e8274" strokeWidth="3"/>
      </g>
      {/* Work lights and warm pools */}
      <g>
        <circle cx="1054" cy="376" r="65" fill="url(#uy-menu-glow)" filter="url(#uy-menu-soft-glow)"/>
        <circle cx="1250" cy="327" r="58" fill="url(#uy-menu-glow)" filter="url(#uy-menu-soft-glow)"/>
        <circle cx="1450" cy="451" r="42" fill="url(#uy-menu-glow)" filter="url(#uy-menu-soft-glow)"/>
        <g fill="#ffd18b"><rect x="1044" y="370" width="19" height="7" rx="2"/><rect x="1241" y="321" width="18" height="7" rx="2"/><rect x="1442" y="445" width="16" height="7" rx="2"/></g>
      </g>
      <g fill="#b8b4a5" opacity=".11">
        <path d="M1091 188q-42-43-15-78 25-31 8-61 52 44 19 91 22 28-12 48z"/>
        <path d="M1260 147q-30-30-8-57 21-23 7-45 39 30 16 65 16 19-9 37z"/>
      </g>
      <rect width="1600" height="900" fill="url(#uy-menu-grain)" opacity=".55"/>
    </svg>
  );
}
