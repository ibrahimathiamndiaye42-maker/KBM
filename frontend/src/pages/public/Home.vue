<script setup>
import { computed } from 'vue';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-vue-next';
import BrandLogo from '../../components/BrandLogo.vue';
import BookingForm from '../../components/BookingForm.vue';
import { site, waLink } from '../../composables/useConfig.js';
import { money } from '../../composables/format.js';

const s = computed(() => site.settings);
const wa = computed(() => waLink('Bonjour, je souhaite prendre rendez-vous.'));
const socials = computed(() => [
  ['Instagram', s.value.instagram, Instagram], ['Facebook', s.value.facebook, Facebook], ['TikTok', s.value.tiktok, null],
].filter(([, url]) => url));
</script>

<template>
  <header class="top">
    <a href="#accueil" class="brand"><BrandLogo :size="38" /><span>{{ s.business_name || 'KEER MAAM BIRABAR' }}</span></a>
    <nav aria-label="Navigation principale">
      <a href="#services">Services</a><a href="#packs">Packs</a><a href="#galerie">Galerie</a><a href="#contact">Contact</a>
      <a href="#reserver" class="btn gold sm">Réserver</a>
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
      <ul class="menu">
        <li v-for="x in site.services" :key="x.id">
          <span class="n">{{ x.nom }}<small v-if="x.description">{{ x.description }}</small></span><i></i><b>{{ money(x.prix) }}</b>
        </li>
      </ul>
    </section>

    <section id="packs" class="sec alt">
      <h2>Nos packs</h2>
      <div class="packs">
        <article v-for="p in site.packs" :key="p.id" class="pack">
          <h3>{{ p.nom }}</h3>
          <p class="price">{{ money(p.prix) }}</p>
          <p v-if="p.description" class="muted">{{ p.description }}</p>
          <a href="#reserver" class="btn ghost sm">Réserver ce pack</a>
        </article>
      </div>
    </section>

    <section id="apropos" class="sec narrow">
      <h2>À propos</h2>
      <p v-if="s.about_text" class="about">{{ s.about_text }}</p>
      <p v-else class="about">Un institut de beauté pensé comme une parenthèse : des soins du corps et du visage, dans une ambiance chaleureuse, pour prendre soin de soi en toute sérénité.</p>
    </section>

    <section id="galerie" class="sec alt" v-if="site.gallery.length">
      <h2>Galerie</h2>
      <div class="gal">
        <figure v-for="g in site.gallery" :key="g.id">
          <img :src="`/api/public/gallery/${g.id}/image`" :alt="g.legende || 'Photo de l\'institut'" loading="lazy" />
          <figcaption v-if="g.legende">{{ g.legende }}</figcaption>
        </figure>
      </div>
    </section>

    <section id="reserver" class="sec narrow">
      <h2>Prendre rendez-vous</h2>
      <BookingForm />
    </section>

    <section id="contact" class="sec alt">
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
    </section>
  </main>

  <footer class="foot">
    <span>© {{ new Date().getFullYear() }} {{ s.business_name }}</span>
    <RouterLink to="/admin">Espace équipe</RouterLink>
  </footer>
</template>

<style scoped>
.top { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: .5rem 1rem; background: var(--black); color: #fff; }
.brand { display: flex; align-items: center; gap: .6rem; text-decoration: none; font: 600 1rem var(--serif); letter-spacing: .04em; }
.top nav { display: flex; align-items: center; gap: 1.1rem; font-size: .9rem; }
.top nav a:not(.btn) { text-decoration: none; opacity: .85; }
@media (max-width: 720px) { .top nav a:not(.btn) { display: none; } .brand span { font-size: .85rem; } }

.hero { background: radial-gradient(120% 90% at 85% 0%, #7a5043 0%, var(--choco) 45%, var(--black) 100%); color: #fff; padding: 4.5rem 1.25rem 3.5rem; }
.hero-in { max-width: 760px; margin: 0 auto; }
.hero h1 { color: #fff; font-size: clamp(2.4rem, 9vw, 4.6rem); letter-spacing: .02em; margin-bottom: .25em; }
.tag { font: italic 500 clamp(1.2rem, 4vw, 1.7rem) var(--serif); color: var(--gold); margin: 0 0 1.75rem; }
.cta { display: flex; flex-wrap: wrap; gap: .75rem; }
.values { display: flex; gap: 1.75rem; list-style: none; padding: 1.5rem 0 0; margin: 2.5rem 0 0; border-top: 1px solid rgba(201,162,77,.45); font: 500 1.05rem var(--serif); color: var(--sky); }

.sec { padding: 3.25rem 1.25rem; max-width: 880px; margin: 0 auto; }
.sec.alt { max-width: none; background: #F1EADB; }
.sec.alt > * { max-width: 840px; margin-left: auto; margin-right: auto; }
.sec.narrow { max-width: 620px; }
.sec h2 { font-size: clamp(1.8rem, 5vw, 2.4rem); margin-bottom: 1.25rem; }

.menu { list-style: none; margin: 0; padding: 0; }
.menu li { display: flex; align-items: baseline; gap: .6rem; padding: .7rem 0; }
.menu .n { font-weight: 500; } .menu small { display: block; color: var(--muted); font-size: .82rem; }
.menu i { flex: 1; border-bottom: 2px dotted var(--gold); transform: translateY(-4px); min-width: 1rem; }
.menu b { font: 600 1.05rem var(--serif); color: var(--choco); white-space: nowrap; }

.packs { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
.pack { background: #fff; border: 1px solid var(--line); border-top: 4px solid var(--gold); border-radius: 14px; padding: 1.25rem; display: grid; gap: .35rem; align-content: start; }
.pack h3 { margin: 0; font-size: 1.2rem; } .price { font: 700 1.4rem var(--serif); margin: 0; color: var(--choco); }
.about { font-size: 1.08rem; max-width: 60ch; }

.gal { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); }
.gal img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; }
.gal figcaption { font-size: .8rem; color: var(--muted); padding-top: .25rem; }

.contact { display: grid; gap: 1.5rem; } @media (min-width: 720px) { .contact { grid-template-columns: 1fr 1.2fr; } }
.contact li { display: flex; gap: .6rem; align-items: flex-start; list-style: none; }
.contact ul { padding: 0; margin: 0; } .hours { white-space: pre-line; }
.map { display: grid; gap: .6rem; } .map iframe { width: 100%; height: 280px; border: 0; border-radius: 14px; }
.foot { display: flex; justify-content: space-between; padding: 1.25rem; background: var(--black); color: #b9aca4; font-size: .85rem; }
</style>
