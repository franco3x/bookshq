
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';

// Property IDs
const PROPS = {
    GENDER: 'P21',
    COUNTRY: 'P27', // Country of citizenship
    ETHNICITY: 'P172'
};

export async function fetchAuthorDemographics(authorName) {
    try {
        // 1. Search for author to get QID
        const searchUrl = `${WIKIDATA_API_URL}?action=wbsearchentities&search=${encodeURIComponent(authorName)}&language=en&format=json&type=item&limit=1`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (!searchData.search || searchData.search.length === 0) {
            return null;
        }

        const qid = searchData.search[0].id;

        // 2. Fetch claims for the entity
        const claimsUrl = `${WIKIDATA_API_URL}?action=wbgetentities&ids=${qid}&props=claims&level=en&format=json`;
        const claimsRes = await fetch(claimsUrl);
        const claimsData = await claimsRes.json();

        const entity = claimsData.entities[qid];
        if (!entity || !entity.claims) return null;

        const claims = entity.claims;

        // Helper to resolve a claim to a string value
        // Note: For real robust app, we'd need to fetch the labels for these value QIDs.
        // For now, let's try to get the raw ID and then maybe map common ones or do a second Label lookup.
        // Actually, let's resolve labels immediately to be useful.

        const genderQid = getClaimValue(claims[PROPS.GENDER]);
        const countryQid = getClaimValue(claims[PROPS.COUNTRY]);
        const ethnicityQid = getClaimValue(claims[PROPS.ETHNICITY]);

        const idsToResolve = [genderQid, countryQid, ethnicityQid].filter(id => id);

        if (idsToResolve.length === 0) return {};

        const labels = await resolveLabels(idsToResolve);

        return {
            gender: labels[genderQid] || null,
            nationality: labels[countryQid] || null,
            race: labels[ethnicityQid] || null
        };

    } catch (error) {
        console.error('Error fetching author demographics:', error);
        return null;
    }
}

function getClaimValue(claim) {
    if (!claim || claim.length === 0) return null;
    // Return the main snak's datavalue ID
    try {
        return claim[0].mainsnak.datavalue.value.id;
    } catch (e) {
        return null;
    }
}

async function resolveLabels(ids) {
    if (!ids.length) return {};
    const url = `${WIKIDATA_API_URL}?action=wbgetentities&ids=${ids.join('|')}&props=labels&languages=en&format=json`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const map = {};
        for (const id of ids) {
            if (data.entities[id] && data.entities[id].labels && data.entities[id].labels.en) {
                map[id] = data.entities[id].labels.en.value;
            }
        }
        return map;
    } catch (e) {
        return {};
    }
}
