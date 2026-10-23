<script setup>
import { computed, ref } from 'vue';
import { Clock, Facebook, Instagram, Lock, MapPin, Phone } from 'lucide-vue-next';
import BrandLogo from '../../components/BrandLogo.vue';
import BookingForm from '../../components/BookingForm.vue';
import Lightbox from '../../components/Lightbox.vue';
import ServiceVisual from '../../components/ServiceVisual.vue';
import { booking, site, waLink } from '../../composables/useConfig.js';
import { money } from '../../composables/format.js';

const s = computed(() => site.settings);
const wa = computed(() => waLink('Bonjour, je souhaite prendre rendez-vous.'));
const socials = computed(() => [
  ['Instagram', s.value.instagram, Instagram], ['Facebook', s.value.facebook, Facebook], ['TikTok', s.value.tiktok, null],
].filter(([, url]) => url));
const lightbox = ref(null);
// Évite une dernière rangée incomplète : la dernière photo s'étire pour combler la place restante
const lastSpan = computed(() => { const n = site.gallery.length; if (n <= 3) return 1; const r = (n - 3) % 3; return r === 1 ? 3 : r === 2 ? 2 : 1; });
const lastWideMobile = computed(() => site.gallery.length > 1 && (site.gallery.length - 1) % 2 === 1);
</script>

<template>
  <header class="top">
    <a href="#accueil" class="brand"><BrandLogo :size="38" /><span>{{ s.business_name || 'KEER MAAM BIRABAR' }}</span></a>
    <nav aria-label="Navigation principale">
      <a href="#services" class="lnk">Services</a><a href="#packs" class="lnk">Packs</a>
      <a v-if="site.gallery.length" href="#galerie" class="lnk">Galerie</a><a href="#contact" class="lnk">Contact</a>
      <a href="#reserver" class="btn gold sm">Réserver</a>
      <RouterLink to="/admin" class="team" aria-label="Espace équipe" title="Espace équipe">
        <Lock :size="16" /><span>Espace équipe</span>
      </RouterLink>
    </nav>
  </header>

  <main id="accueil">
    <section class="hero">
      <div class="hero-in">
        <h1>{{ s.business_name || 'KEER MAAM BIRABAR' }}</h1>
        <p class="tag">{{ s.tagline }}</p>
        <div class="cta">
          <a href="#services" class="btn gold">Découvrir nos services</a>
          <a v-if="wa" :href="wa" class="btn light" target="_blank" rel="noopener">Prendre rendez-vous sur WhatsApp</a>
          <a v-else href="#reserver" class="btn light">Prendre rendez-vous</a>
        </div>
        <ul class="values"><li>Beauté</li><li>Bien-être</li><li>Évasion</li></ul>
      </div>
    </section>

    <section id="services" class="sec">
      <h2>Nos services</h2>
      <ul class="cards">
        <li v-for="x in site.services" :key="x.id" class="card-v">
          <ServiceVisual :name="x.nom" :image="x.image" />
          <div class="body">
            <h3>{{ x.nom }}</h3>
            <p v-if="x.description" class="muted desc">{{ x.description }}</p>
            <div class="cfoot">
              <b>{{ money(x.prix) }}</b>
              <a href="#reserver" class="btn ghost sm" @click="booking.item = `service:${x.id}`">Réserver</a>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <section id="packs" class="band">
      <div class="sec">
        <h2>Nos packs</h2>
        <ul class="cards packs">
          <li v-for="p in site.packs" :key="p.id" class="card-v pack">
            <ServiceVisual :name="p.nom" :image="p.image" />
            <div class="body">
              <h3>{{ p.nom }}</h3>
              <p v-if="p.description" class="muted desc">{{ p.description }}</p>
              <div class="cfoot">
                <b>{{ money(p.prix) }}</b>
                <a href="#reserver" class="btn gold sm" @click="booking.item = `pack:${p.id}`">Réserver</a>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section id="apropos" class="sec">
      <div class="about" :class="{ withimg: site.aboutImage }">
        <div class="about-text">
          <h2>À propos</h2>
          <p v-if="s.about_text">{{ s.about_text }}</p>
          <p v-else>Un institut de beauté pensé comme une parenthèse : des soins du corps et du visage, dans une ambiance chaleureuse, pour prendre soin de soi en toute sérénité.</p>
        </div>
        <figure v-if="site.aboutImage" class="about-img"><img :src="site.aboutImage" :alt="`L'institut ${s.business_name}`" loading="lazy" /></figure>
      </div>
    </section>

    <section id="galerie" class="band" v-if="site.gallery.length">
      <div class="sec">
        <h2>Galerie</h2>
        <div class="gal">
          <button v-for="(g, i) in site.gallery" :key="g.id" class="tile" type="button"
            :class="{ last: i === site.gallery.length - 1 && i > 0, 'last-wide-m': lastWideMobile }"
            :style="{ '--last-span': lastSpan }"
            :aria-label="g.legende ? `Agrandir : ${g.legende}` : 'Agrandir la photo'" @click="lightbox = i">
            <img :src="`/api/public/gallery/${g.id}/image`" :alt="g.legende || 'Photo de l\'institut'" loading="lazy" />
            <span v-if="g.legende" class="cap">{{ g.legende }}</span>
          </button>
        </div>
      </div>
    </section>

    <section id="reserver" class="sec narrow">
      <h2>Prendre rendez-vous</h2>
      <BookingForm />
    </section>

    <section id="contact" class="band">
      <div class="sec">
        <h2>Contact</h2>
        <div class="contact">
          <ul class="stack">
            <li v-if="s.phone"><Phone :size="18" /> <a :href="`tel:${s.phone}`">{{ s.phone }}</a></li>
            <li v-if="wa"><Phone :size="18" /> <a :href="wa" target="_blank" rel="noopener">WhatsApp</a></li>
            <li v-if="s.address"><MapPin :size="18" /> {{ s.address }}</li>
            <li v-if="s.hours" class="hours"><Clock :size="18" /> {{ s.hours }}</li>
            <li v-for="[label, url] in socials" :key="label"><a :href="url" target="_blank" rel="noopener">{{ label }}</a></li>
            <li v-if="!s.phone && !s.address && !s.hours && !wa" class="muted">Les coordonnées de l'institut seront bientôt disponibles.</li>
          </ul>
          <div class="map" v-if="s.maps_embed_url">
            <iframe :src="s.maps_embed_url" title="Localisation de l'institut" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
            <a v-if="s.maps_link" :href="s.maps_link" target="_blank" rel="noopener" class="btn ghost sm">Ouvrir dans Google Maps</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="sitefoot">
    <div class="foot-in">
      <div class="fb"><BrandLogo :size="44" /><div><strong>{{ s.business_name }}</strong><span>{{ s.tagline }}</span></div></div>
      <nav class="fl" aria-label="Pied de page">
        <a href="#services">Services</a><a href="#packs">Packs</a><a href="#reserver">Réserver</a><a href="#contact">Contact</a>
      </nav>
      <RouterLink to="/admin" class="team-foot"><Lock :size="16" /> Espace équipe</RouterLink>
    </div>
    <p class="copy">© {{ new Date().getFullYear() }} {{ s.business_name }}. Tous droits réservés.</p>
  </footer>

  <Lightbox v-if="lightbox !== null" :items="site.gallery" :index="lightbox" @close="lightbox = null" @change="lightbox = $event" />
</template>

<style scoped>
.top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: .5rem 1rem; background: var(--black); color: #fff; }
.brand { display: flex; align-items: center; gap: .6rem; text-decoration: none; font: 600 1rem var(--serif); letter-spacing: .04em; }
.top nav { display: flex; align-items: center; gap: 1rem; font-size: .9rem; }
.lnk { text-decoration: none; opacity: .85; } .lnk:hover { opacity: 1; }
.team { display: inline-flex; align-items: center; gap: .45rem; min-height: 40px; padding: 0 .9rem; border: 1px solid rgba(255,255,255,.35);
  border-radius: 999px; text-decoration: none; font-size: .85rem; opacity: .9; }
.team:hover { background: rgba(255,255,255,.1); opacity: 1; }
@media (max-width: 860px) { .lnk { display: none; } .team { width: 44px; height: 44px; padding: 0; justify-content: center; } .team span { display: none; } .brand span { font-size: .85rem; } }

.hero { background: radial-gradient(120% 90% at 85% 0%, #7a5043 0%, var(--choco) 45%, var(--black) 100%); color: #fff; padding: 4.5rem 1.25rem 3.5rem; }
.hero-in { max-width: 1040px; margin: 0 auto; }
.hero h1 { color: #fff; font-size: clamp(2.4rem, 9vw, 4.6rem); letter-spacing: .02em; margin-bottom: .25em; max-width: 14ch; }
.tag { font: italic 500 clamp(1.2rem, 4vw, 1.7rem) var(--serif); color: var(--gold); margin: 0 0 1.75rem; }
.cta { display: flex; flex-wrap: wrap; gap: .75rem; }
.values { display: flex; gap: 1.75rem; list-style: none; padding: 1.5rem 0 0; margin: 2.5rem 0 0; border-top: 1px solid rgba(201,162,77,.45); font: 500 1.05rem var(--serif); color: var(--sky); }

.sec { padding: 3.5rem 1.25rem; max-width: 1120px; margin: 0 auto; }
.sec.narrow { max-width: 640px; }
.band { background: #F1EADB; }
.sec h2 { font-size: clamp(1.8rem, 5vw, 2.5rem); margin-bottom: 1.5rem; }

.cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 1.25rem; grid-template-columns: 1fr; }
@media (min-width: 600px) { .cards { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 960px) { .cards { grid-template-columns: repeat(3, 1fr); } .cards.packs { grid-template-columns: repeat(4, 1fr); } }
.card-v { display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line); border-radius: 18px; overflow: hidden;
  transition: box-shadow .2s, transform .2s; }
.card-v:hover { box-shadow: 0 14px 32px -16px rgba(60, 35, 28, .45); transform: translateY(-3px); }
.card-v:hover :deep(.visual img) { transform: scale(1.05); }
.pack { border-top: 4px solid var(--gold); }
.body { display: flex; flex-direction: column; gap: .35rem; padding: 1rem 1.15rem 1.15rem; flex: 1; }
.body h3 { font-size: 1.2rem; margin: 0; } .desc { margin: 0; font-size: .92rem; }
.cfoot { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; margin-top: auto; padding-top: .6rem; }
.cfoot b { font: 700 1.2rem var(--serif); color: var(--choco); white-space: nowrap; }

.about { display: grid; gap: 2rem; align-items: center; }
.about-text p { font-size: 1.08rem; max-width: 60ch; margin: 0; }
.about-text h2 { margin-bottom: 1rem; }
.about-img { margin: 0; position: relative; }
.about-img img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 18px; position: relative; z-index: 1; }
.about-img::before { content: ''; position: absolute; inset: 14px -12px -12px 14px; border: 2px solid var(--gold); border-radius: 18px; }
@media (min-width: 820px) { .about.withimg { grid-template-columns: 1.2fr 1fr; gap: 3.5rem; } }

/* Galerie : grandes images, première mise à l'honneur, agrandissement au clic */
.gal { display: grid; gap: .75rem; grid-template-columns: repeat(2, 1fr); grid-auto-rows: 190px; }
.tile { position: relative; padding: 0; border: 0; border-radius: 16px; overflow: hidden; cursor: zoom-in; background: var(--choco); }
.tile:first-child { grid-column: 1 / -1; grid-row: span 2; }
.tile img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease; }
.tile:hover img { transform: scale(1.05); }
.cap { position: absolute; inset: auto 0 0 0; padding: 1.75rem 1rem .8rem; text-align: left; color: #fff; font-size: .9rem;
  background: linear-gradient(to top, rgba(26,17,15,.8), transparent); }
@media (max-width: 719px) { .tile.last.last-wide-m { grid-column: 1 / -1; } }
@media (min-width: 720px) { .tile.last { grid-column: span var(--last-span, 1); } .gal { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 270px; gap: 1rem; } .tile:first-child { grid-column: span 2; } }
@media (min-width: 1000px) { .gal { grid-auto-rows: 300px; } }

.contact { display: grid; gap: 1.5rem; } @media (min-width: 720px) { .contact { grid-template-columns: 1fr 1.3fr; } }
.contact li { display: flex; gap: .6rem; align-items: flex-start; list-style: none; }
.contact ul { padding: 0; margin: 0; } .hours { white-space: pre-line; }
.map { display: grid; gap: .6rem; } .map iframe { width: 100%; height: 300px; border: 0; border-radius: 16px; }

.sitefoot { background: var(--black); color: #cdbfb6; padding: 2.25rem 1.25rem 1.25rem; }
.foot-in { max-width: 1120px; margin: 0 auto; display: grid; gap: 1.5rem; align-items: center; }
@media (min-width: 820px) { .foot-in { grid-template-columns: 1fr auto auto; gap: 2.5rem; } }
.fb { display: flex; align-items: center; gap: .8rem; } .fb div { display: grid; } .fb strong { font: 600 1.05rem var(--serif); color: #fff; letter-spacing: .04em; }
.fb span { font-size: .85rem; color: var(--gold); }
.fl { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; font-size: .9rem; } .fl a { text-decoration: none; } .fl a:hover { color: #fff; }
.team-foot { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 46px; padding: 0 1.25rem; border: 1.5px solid var(--gold);
  border-radius: 999px; color: var(--gold); text-decoration: none; font: 600 .9rem var(--sans); }
.team-foot:hover { background: var(--gold); color: var(--black); }
.copy { max-width: 1120px; margin: 1.75rem auto 0; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,.12); font-size: .8rem; color: #9c8f87; }
</style>
