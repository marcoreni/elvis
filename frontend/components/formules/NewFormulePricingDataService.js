import DataService from "../common/baseDataTable/DataService";
import * as api from "../../tools/api";

export default class NewFormulePricingDataService extends DataService {
    constructor(
        handleSavePricingForNewFormule,
        handleUpdatePricingForNewFormule,
        handleDeletePricingForNewFormule,
        forumulePricings,
        pricing_categories
    ) {
        super("/formule_pricings");

        this.handleSavePricingForNewFormule = handleSavePricingForNewFormule;
        this.handleUpdatePricingForNewFormule =
            handleUpdatePricingForNewFormule;
        this.handleDeletePricingForNewFormule =
            handleDeletePricingForNewFormule;

        this.pricing_categories = pricing_categories || [];
        // A copy, not the caller's array directly: createData/deleteData mutate
        // this.forumulePricings in place (push/splice). EditFormule.jsx currently only ever seeds
        // this with `formule.formule_pricings` for a brand-new, pricing-less formule (`[]`), but if
        // this is ever reused for a formule that already has seeded pricings, mutating that array
        // in place would also mutate the prop it was handed.
        this.forumulePricings = [...(forumulePricings || [])];
        // Seeded above the max existing id (not hardcoded 1) so a new temp id can't collide with a
        // real seeded one, for the same not-yet-reachable-today reason.
        this.tempIdCounter =
            Math.max(0, ...this.forumulePricings.map((p) => p.id || 0)) + 1;

        this.createData = this.createData.bind(this);
    }

    listData(filter, format) {
        return new Promise((resolve, reject) => {
            return resolve({
                // A fresh array, not `this.forumulePricings` directly: TanStackGrid's row-model
                // cache is keyed by data reference, and createData/deleteData mutate this array in
                // place (push/splice) rather than replacing it, so returning it as-is here would
                // hand back the *same* reference before and after a create/delete -- the new/
                // removed row would never appear, since nothing actually changed by reference.
                data: [...this.forumulePricings],
                pages: 1,
                total: this.forumulePricings.length,
            });
        });
    }

    updateData(data) {
        // console.log(data)
        const updatedPricing = {
            id: data.id,
            price: data.price,
            from_season_id: data.fromSeason.value,
            to_season_id: data.toSeason.value,
            pricing_category: {
                id: data.pricing_category.id,
                name: data.pricing_category.name,
            },
        };

        let index = this.forumulePricings.findIndex(
            (arp) => arp.id === data.id
        );
        this.forumulePricings[index] = updatedPricing;

        // update the state of the parent component
        this.handleUpdatePricingForNewFormule(updatedPricing);

        return new Promise((resolve, reject) => {
            return resolve({
                data: updatedPricing,
            });
        });
    }

    createData(data) {
        let pc = this.pricing_categories.find(
            (pc) => pc.name === data.name.label
        );

        const newPricing = {
            id: this.tempIdCounter++, // temporary id
            price: data.price,
            from_season_id: data.fromSeason.value,
            to_season_id: data.toSeason ? data.toSeason.value : null,
            pricing_category: {
                id: pc.id,
                name: pc.name,
            },
        };

        // add to pricing_categories the new pricing
        this.forumulePricings.push(newPricing);

        // update the state of the parent component
        this.handleSavePricingForNewFormule(newPricing);

        return new Promise((resolve, reject) => {
            return resolve({
                data: newPricing,
            });
        });
    }

    deleteData(data) {
        let index = this.forumulePricings.findIndex(
            (arp) => arp.id === data.id
        );
        this.forumulePricings.splice(index, 1);

        // update the state of the parent component
        this.handleDeletePricingForNewFormule(data);

        return new Promise((resolve, reject) => {
            return resolve({
                data: this.forumulePricings,
            });
        });
    }
}
