export default function BookConventionStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: 'DM Sans', sans-serif;
        background: #F8F7F3;
        color: #08102A;
        overflow-x: hidden;
      }

      @keyframes sk {
        0%, 100% { opacity: .5; }
        50% { opacity: 1; }
      }

      @keyframes fadeUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }

      .conv-hero-eyebrow { animation: fadeUp .5s .1s cubic-bezier(.4,0,.2,1) both; }
      .conv-hero-h1 { animation: fadeUp .6s .25s cubic-bezier(.4,0,.2,1) both; }
      .conv-hero-sub { animation: fadeUp .6s .4s cubic-bezier(.4,0,.2,1) both; }
      .conv-search-wrap { animation: fadeUp .6s .5s cubic-bezier(.4,0,.2,1) both; }

      .conv-search:focus {
        border-color: rgba(46,64,128,.4) !important;
        box-shadow: 0 0 0 4px rgba(46,64,128,.08) !important;
        outline: none;
      }

      .cat-pill {
        border: 1px solid rgba(8,16,42,.12);
        background: #fff;
        border-radius: 999px;
        padding: .45rem 1.1rem;
        font-size: .8rem;
        font-weight: 600;
        color: #6B7280;
        cursor: pointer;
        transition: background .18s, color .18s, border-color .18s;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .cat-pill:hover {
        background: rgba(8,16,42,.05);
        color: #08102A;
        border-color: rgba(8,16,42,.22);
      }

      .cat-pill.active {
        background: #08102A;
        color: #fff;
        border-color: #08102A;
      }

      .conv-card {
        background: #fff;
        border: 1px solid rgba(8,16,42,.07);
        border-radius: 1.75rem;
        padding: 1.6rem;
        display: flex;
        flex-direction: column;
        gap: .5rem;
        transition: transform .28s cubic-bezier(.4,0,.2,1), box-shadow .28s, border-color .28s;
        box-shadow: 0 2px 12px rgba(8,16,42,.04);
      }

      .conv-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 16px 48px rgba(8,16,42,.1);
        border-color: rgba(8,16,42,.12);
      }

      .conv-card-books {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        color: #fff;
        text-decoration: none;
        border-color: rgba(255,255,255,.24);
        background:
          radial-gradient(circle at 86% 8%, rgba(82,214,255,.35) 0%, rgba(82,214,255,0) 42%),
          linear-gradient(135deg, #071A52 0%, #1246A3 62%, #076C99 100%);
        box-shadow: 0 8px 28px rgba(18,70,163,.18);
      }

      .conv-card-books:hover {
        border-color: rgba(255,255,255,.42);
        box-shadow: 0 18px 48px rgba(18,70,163,.28);
      }

      .conv-card-books:focus-visible {
        outline: 3px solid #071A52;
        outline-offset: 3px;
      }

      .book-card-arrow {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        background: rgba(255,255,255,.15);
        border: 1px solid rgba(255,255,255,.2);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 32px;
        font-size: 1rem;
        transition: transform .18s ease, background .18s ease;
      }

      .conv-card-books:hover .book-card-arrow {
        transform: translateX(3px);
        background: rgba(255,255,255,.22);
      }

      .conv-grid-state {
        grid-column: 1 / -1;
      }

      .card-cta:hover {
        background: rgba(8,16,42,.04) !important;
        border-color: rgba(8,16,42,.25) !important;
      }

      .empty-state {
        text-align: center;
        padding: 5rem 2rem;
        color: #6B7280;
      }

      @media (max-width: 700px) {
        .conv-page-content {
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
        }

        .conv-hero {
          padding: 8rem 1.25rem 2.5rem !important;
        }

        .conv-grid {
          grid-template-columns: 1fr !important;
        }

      }

      .book-page {
        min-height: 100vh;
        background: #F8F7F3;
        color: #08102A;
        font-family: 'DM Sans', sans-serif;
      }

      .book-shell {
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
      }

      .book-hero {
        padding: 8.5rem 3rem 2.75rem;
      }

      .book-back-link {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        gap: .45rem;
        color: #2E4080;
        font-size: .75rem;
        font-weight: 700;
        text-decoration: none;
        transition: color .18s ease;
      }

      .book-back-link:hover {
        color: #08102A;
      }

      .book-back-link:focus-visible,
      .book-retry-button:focus-visible,
      .book-inline-button:focus-visible,
      .book-clear-search:focus-visible,
      .cat-pill:focus-visible {
        outline: 3px solid rgba(26,51,153,.3);
        outline-offset: 2px;
      }

      .book-hero-grid {
        display: block;
        max-width: 46rem;
        margin-top: 1.1rem;
      }

      .book-hero-eyebrow {
        color: #2E4080;
        font-size: .68rem;
        font-weight: 700;
        letter-spacing: .22em;
        text-transform: uppercase;
      }

      .book-hero-title {
        max-width: 700px;
        font-family: 'Cormorant Garamond', serif;
        font-size: clamp(3rem,6vw,5.25rem);
        font-weight: 700;
        line-height: .96;
        letter-spacing: -.025em;
        color: #08102A;
      }

      .book-hero-title span {
        color: #2E4080;
      }

      .book-hero-description {
        max-width: 700px;
        margin-top: 1.35rem;
        color: #6B7280;
        font-size: .92rem;
        line-height: 1.75;
        white-space: pre-line;
      }

      .book-filter-label {
        display: block;
        margin-bottom: .5rem;
        color: #596174;
        font-size: .66rem;
        font-weight: 700;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .book-notices {
        display: grid;
        gap: .75rem;
        padding: 0 3rem;
      }

      .book-notice {
        display: flex;
        align-items: flex-start;
        gap: .75rem;
        border: 1px solid;
        border-radius: 1rem;
        padding: .9rem 1rem;
        font-size: .76rem;
        line-height: 1.55;
      }

      .book-notice > svg {
        flex: none;
        margin-top: .08rem;
      }

      .book-notice strong {
        display: block;
        margin-bottom: .14rem;
        font-size: .78rem;
      }

      .book-notice.success {
        border-color: #CFE6D6;
        background: #F2FAF4;
        color: #145C31;
      }

      .book-notice.success p {
        color: #477257;
      }

      .book-notice.warning {
        border-color: #E7D7B5;
        background: #FFF9ED;
        color: #73551A;
      }

      .book-error-state {
        max-width: 36rem;
        margin: 2.5rem auto 0;
        border: 1px solid rgba(14,31,107,.1);
        border-radius: 1.75rem;
        background: #fff;
        padding: 2.25rem;
        color: #9A3B3B;
        text-align: center;
        box-shadow: 0 12px 36px rgba(14,31,107,.06);
      }

      .book-error-state h1 {
        margin-top: 1rem;
        color: #08102A;
        font-family: 'Cormorant Garamond', serif;
        font-size: 2.35rem;
        font-weight: 700;
        line-height: 1;
      }

      .book-error-state p {
        margin-top: .75rem;
        color: #596174;
        font-size: .86rem;
        line-height: 1.65;
      }

      .book-retry-button {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        gap: .45rem;
        margin-top: 1.5rem;
        border: 0;
        border-radius: 999px;
        background: #0E1F6B;
        padding: .7rem 1.25rem;
        color: #fff;
        font: inherit;
        font-size: .76rem;
        font-weight: 700;
        cursor: pointer;
      }

      .book-retry-button:hover {
        background: #1A3399;
      }

      .book-shop {
        max-width: 1440px;
        padding: 0 3rem 6rem;
      }

      .book-shop-layout {
        display: grid;
        grid-template-columns: minmax(0,1fr) 18rem;
        align-items: start;
        gap: 1.25rem;
        margin-top: 1.25rem;
      }

      .book-catalog {
        min-width: 0;
      }

      .book-toolbar {
        border: 1px solid rgba(8,16,42,.07);
        border-radius: 1.75rem;
        background: #fff;
        padding: 1.15rem;
        box-shadow: 0 2px 12px rgba(8,16,42,.04);
      }

      .book-search-field {
        position: relative;
      }

      .book-search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #6B7280;
        pointer-events: none;
      }

      .book-search-field .conv-search {
        width: 100%;
        min-height: 46px;
        border: 1px solid rgba(8,16,42,.1);
        border-radius: 999px;
        background: #FDFDFC;
        padding: .8rem 3rem .8rem 2.7rem;
        color: #08102A;
        font: inherit;
        font-size: .86rem;
        box-shadow: inset 0 1px 0 rgba(8,16,42,.02);
        transition: border-color .18s ease, box-shadow .18s ease;
      }

      .book-search-field .conv-search::placeholder {
        color: #7B8290;
      }

      .book-search-field .conv-search::-webkit-search-cancel-button {
        appearance: none;
      }

      .book-clear-search {
        position: absolute;
        right: .45rem;
        top: 50%;
        width: 36px;
        height: 36px;
        transform: translateY(-50%);
        border: 0;
        border-radius: 50%;
        background: rgba(8,16,42,.055);
        color: #596174;
        cursor: pointer;
      }

      .book-filter-group {
        margin-top: 1rem;
      }

      .book-filter-scroll {
        display: flex;
        gap: .55rem;
        overflow-x: auto;
        padding: .15rem .1rem .35rem;
        scrollbar-width: none;
      }

      .book-filter-scroll::-webkit-scrollbar {
        display: none;
      }

      .cat-pill {
        min-height: 42px;
      }

      .cat-pill:disabled {
        cursor: not-allowed;
        opacity: .45;
      }

      .book-pill-count {
        margin-left: .35rem;
        opacity: .65;
        font-size: .67rem;
      }

      .book-results-head {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 1rem;
        margin: 1.5rem 0 .9rem;
      }

      .book-results-eyebrow {
        color: #2E4080;
        font-size: .66rem;
        font-weight: 700;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      .book-results-title {
        margin-top: .2rem;
        color: #08102A;
        font-family: 'Cormorant Garamond', serif;
        font-size: clamp(1.65rem,3vw,2rem);
        font-weight: 700;
        line-height: 1.1;
      }

      .book-results-count {
        flex-shrink: 0;
        color: #596174;
        font-size: .72rem;
        font-weight: 650;
      }

      .book-product-grid {
        display: grid;
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 1rem;
      }

      .book-product-card {
        min-width: 0;
        overflow: hidden;
        padding: 0;
        gap: 0;
      }

      .book-product-card.selected {
        border-color: #1A3399;
        background: #FCFCFF;
        box-shadow: 0 12px 34px rgba(14,31,107,.1);
      }

      .book-product-card.unavailable:hover {
        transform: none;
        border-color: rgba(8,16,42,.07);
        box-shadow: 0 2px 12px rgba(8,16,42,.04);
      }

      .book-product-media {
        position: relative;
        isolation: isolate;
        display: flex;
        height: 198px;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-bottom: 1px solid rgba(8,16,42,.06);
        background:
          radial-gradient(circle at 75% 15%, rgba(200,212,245,.58), transparent 40%),
          #F3F5FA;
        padding: .85rem;
      }

      .book-product-cover-stage {
        position: absolute;
        z-index: 1;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .book-product-cover-stage::after {
        position: absolute;
        z-index: 1;
        inset: 0;
        background: linear-gradient(
          180deg,
          rgba(243,245,250,.38) 0%,
          rgba(243,245,250,.64) 100%
        );
        content: "";
        pointer-events: none;
      }

      .book-product-cover-ambient {
        position: absolute;
        z-index: 0;
        inset: -18%;
        width: 136%;
        height: 136%;
        object-fit: cover;
        opacity: .2;
        filter: blur(25px) saturate(.82);
        transform: scale(1.06);
      }

      .book-product-cover {
        position: relative;
        z-index: 2;
        display: block;
        width: auto;
        max-width: 78%;
        height: 170px;
        border-radius: .55rem;
        object-fit: contain;
        box-shadow:
          0 16px 30px rgba(8,16,42,.2),
          0 0 0 1px rgba(255,255,255,.5);
        transition: transform .28s cubic-bezier(.4,0,.2,1), box-shadow .28s ease;
      }

      .book-product-card:hover .book-product-cover {
        transform: translateY(-3px) scale(1.015);
        box-shadow:
          0 20px 36px rgba(8,16,42,.24),
          0 0 0 1px rgba(255,255,255,.62);
      }

      .book-cover-placeholder {
        position: relative;
        z-index: 1;
        display: flex;
        width: 108px;
        height: 152px;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: .65rem;
        border: 1px solid rgba(14,31,107,.13);
        border-radius: .7rem 1rem 1rem .7rem;
        background: #fff;
        color: #2E4080;
        box-shadow: -5px 8px 18px rgba(8,16,42,.12);
      }

      .book-cover-placeholder span {
        font-size: .58rem;
        font-weight: 800;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      .book-product-type {
        position: absolute;
        z-index: 3;
        top: .85rem;
        left: .85rem;
        display: inline-flex;
        align-items: center;
        gap: .35rem;
        border: 1px solid rgba(8,16,42,.08);
        border-radius: 999px;
        background: rgba(255,255,255,.9);
        padding: .32rem .65rem;
        color: #596174;
        font-size: .62rem;
        font-weight: 800;
        letter-spacing: .09em;
        text-transform: uppercase;
        backdrop-filter: blur(8px);
      }

      .book-product-type.bundle {
        border-color: transparent;
        background: #0E1F6B;
        color: #fff;
      }

      .book-product-selected-mark {
        position: absolute;
        z-index: 3;
        top: .85rem;
        right: .85rem;
        display: flex;
        width: 30px;
        height: 30px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(14,31,107,.16);
        border-radius: 50%;
        background: #fff;
        color: transparent;
        opacity: 0;
        transform: scale(.82);
        transition: opacity .18s ease, transform .18s ease;
      }

      .book-product-card.selected .book-product-selected-mark {
        border-color: #0E1F6B;
        background: #0E1F6B;
        color: #fff;
        opacity: 1;
        transform: scale(1);
      }

      .book-product-body {
        display: flex;
        flex: 1;
        flex-direction: column;
        padding: 1.15rem;
      }

      .book-product-title {
        color: #08102A;
        font-size: 1rem;
        font-weight: 750;
        letter-spacing: -.01em;
        line-height: 1.35;
      }

      .book-product-description {
        display: -webkit-box;
        overflow: hidden;
        margin-top: .45rem;
        color: #596174;
        font-size: .8rem;
        line-height: 1.6;
        white-space: pre-line;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
      }

      .book-product-isbn {
        margin-top: .35rem;
        color: #2E4080;
        font-size: .65rem;
        font-weight: 750;
        letter-spacing: .06em;
      }

      .book-bundle-items {
        margin-top: .75rem;
        border-radius: .85rem;
        background: rgba(14,31,107,.045);
        padding: .7rem .8rem;
      }

      .book-bundle-items-label {
        color: #2E4080;
        font-size: .61rem;
        font-weight: 800;
        letter-spacing: .11em;
        text-transform: uppercase;
      }

      .book-bundle-items ul {
        display: grid;
        gap: .3rem;
        margin-top: .4rem;
        list-style: none;
      }

      .book-bundle-items li {
        display: flex;
        gap: .45rem;
        color: #44506D;
        font-size: .7rem;
        line-height: 1.4;
      }

      .book-bundle-item-copy {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: .08rem;
      }

      .book-bundle-item-isbn {
        color: #68718A;
        font-size: .61rem;
        font-weight: 700;
        letter-spacing: .035em;
      }

      .book-bundle-dot {
        width: 4px;
        height: 4px;
        flex: 0 0 4px;
        margin-top: .48rem;
        border-radius: 50%;
        background: #1A3399;
      }

      .book-product-footer {
        display: grid;
        grid-template-columns: minmax(0,1fr) auto;
        align-items: end;
        gap: .8rem;
        margin-top: auto;
        border-top: 1px solid rgba(8,16,42,.07);
        padding-top: .9rem;
      }

      .book-product-year {
        display: block;
        color: #6B7280;
        font-size: .68rem;
        font-weight: 650;
      }

      .book-product-price {
        display: block;
        margin-top: .1rem;
        color: #08102A;
        font-size: 1.18rem;
        font-weight: 800;
        letter-spacing: -.025em;
      }

      .book-product-convention-label {
        display: block;
        margin-top: .48rem;
        color: #2E4080;
        font-size: .59rem;
        font-weight: 750;
        letter-spacing: .085em;
        line-height: 1.2;
        text-transform: uppercase;
      }

      .book-product-original-price {
        display: block;
        margin-top: .35rem;
        color: #7B8290;
        font-size: .64rem;
        font-weight: 650;
        text-decoration: line-through;
      }

      .book-product-saving {
        display: inline-flex;
        margin-top: .3rem;
        border-radius: 999px;
        background: #EAF7EE;
        padding: .2rem .48rem;
        color: #166534;
        font-size: .61rem;
        font-weight: 800;
      }

      .book-product-action {
        display: inline-flex;
        min-width: 112px;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        gap: .4rem;
        border: 1px solid #0E1F6B;
        border-radius: 999px;
        background: #0E1F6B;
        padding: .55rem .85rem;
        color: #fff;
        font: inherit;
        font-size: .73rem;
        font-weight: 750;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, color .18s ease;
      }

      .book-product-action:hover {
        border-color: #1A3399;
        background: #1A3399;
      }

      .book-product-action.selected {
        background: #fff;
        color: #0E1F6B;
      }

      .book-product-action:focus-visible {
        outline: 3px solid rgba(26,51,153,.25);
        outline-offset: 2px;
      }

      .book-product-action:disabled {
        min-width: 0;
        max-width: 150px;
        border-color: rgba(8,16,42,.09);
        background: #F0F2F6;
        color: #596174;
        cursor: not-allowed;
        line-height: 1.25;
      }

      .book-empty-catalog {
        border: 1px dashed rgba(8,16,42,.16);
        border-radius: 1.5rem;
        background: #fff;
        padding: 3.5rem 1.5rem;
        text-align: center;
      }

      .book-empty-title {
        color: #344363;
        font-size: .92rem;
        font-weight: 700;
      }

      .book-empty-copy {
        max-width: 32rem;
        margin: .5rem auto 0;
        color: #596174;
        font-size: .8rem;
        line-height: 1.65;
      }

      .book-empty-copy.compact {
        max-width: 28rem;
        font-size: .76rem;
      }

      .book-inline-button {
        display: inline-flex;
        min-height: 42px;
        align-items: center;
        justify-content: center;
        margin-top: 1rem;
        border: 1px solid rgba(8,16,42,.12);
        border-radius: 999px;
        background: #fff;
        padding: .55rem 1rem;
        color: #08102A;
        font: inherit;
        font-size: .76rem;
        font-weight: 700;
        cursor: pointer;
      }

      .book-loading-grid {
        display: grid;
        grid-template-columns: minmax(0,1fr) 18rem;
        gap: 1.25rem;
        margin-top: 2rem;
      }

      .book-skeleton-back,
      .book-skeleton-eyebrow,
      .book-skeleton-title,
      .book-skeleton-line,
      .book-skeleton-toolbar,
      .book-skeleton-cart {
        background: #E2E5EC;
        animation: sk 1.4s ease infinite;
      }

      .book-skeleton-back {
        width: 10rem;
        height: 44px;
        border-radius: 999px;
      }

      .book-skeleton-eyebrow {
        width: 9rem;
        height: .75rem;
        border-radius: 999px;
      }

      .book-skeleton-title {
        width: min(100%,36rem);
        height: 6rem;
        margin-top: 1.25rem;
        border-radius: 1.5rem;
      }

      .book-skeleton-line {
        width: min(100%,42rem);
        height: 1rem;
        margin-top: 1.25rem;
        border-radius: 999px;
        background: #E7E9EE;
      }

      .book-skeleton-line.short {
        width: min(80%,36rem);
        margin-top: .5rem;
      }

      .book-skeleton-toolbar {
        height: 12rem;
        border-radius: 1.75rem;
      }

      .book-skeleton-list {
        display: grid;
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 1rem;
        margin-top: 1rem;
      }

      .book-skeleton-cart {
        height: 20rem;
        border-radius: 1.5rem;
      }

      .book-skeleton-card {
        min-height: 390px;
        border-radius: 1.75rem;
        background: #E7E9EE;
        animation: sk 1.4s ease infinite;
      }

      @media (max-width: 1199px) {
        .book-product-grid,
        .book-skeleton-list {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }
      }

      @media (max-width: 1023px) {
        .book-shop-layout,
        .book-loading-grid {
          grid-template-columns: 1fr;
        }

        .book-product-grid {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }
      }

      @media (max-width: 700px) {
        .book-hero {
          padding: 7.5rem 1.25rem 2.2rem;
        }

        .book-hero-title {
          font-size: clamp(2.75rem,14vw,4rem);
        }

        .book-notices,
        .book-shop {
          padding-left: 1.25rem;
          padding-right: 1.25rem;
        }

        .book-shop {
          padding-bottom: 7rem;
        }

        .book-toolbar {
          border-radius: 1.35rem;
          padding: .9rem;
        }

        .book-product-grid {
          grid-template-columns: 1fr;
        }

        .book-skeleton-list {
          grid-template-columns: 1fr;
        }

        .book-product-media {
          height: 190px;
        }

        .book-product-cover {
          height: 164px;
        }

        .book-results-head {
          align-items: flex-start;
        }
      }

      @media (max-width: 390px) {
        .book-product-footer {
          grid-template-columns: 1fr;
          align-items: stretch;
        }

        .book-product-action {
          width: 100%;
          max-width: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .conv-hero-eyebrow,
        .conv-hero-h1,
        .conv-hero-sub,
        .conv-search-wrap,
        .book-skeleton-card,
        .book-skeleton-back,
        .book-skeleton-eyebrow,
        .book-skeleton-title,
        .book-skeleton-line,
        .book-skeleton-toolbar,
        .book-skeleton-cart {
          animation: none;
        }

        .conv-card,
        .book-card-arrow,
        .book-product-cover,
        .book-product-selected-mark,
        .book-product-action {
          transition: none;
        }

        .conv-card:hover,
        .conv-card-books:hover,
        .conv-card-books:hover .book-card-arrow {
          transform: none;
        }
      }
    `}</style>
  );
}
