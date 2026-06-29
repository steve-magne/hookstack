import { beforeEach, describe, expect, it } from "vitest";
import { useSelection } from "@/store/selection";

beforeEach(() => {
	useSelection.getState().clear();
});

describe("useSelection — toggle", () => {
	it("ajoute un slug absent", () => {
		useSelection.getState().toggle("foo");
		expect(useSelection.getState().selected).toContain("foo");
	});

	it("retire un slug déjà présent", () => {
		useSelection.getState().toggle("foo");
		useSelection.getState().toggle("foo");
		expect(useSelection.getState().selected).not.toContain("foo");
	});
});

describe("useSelection — add", () => {
	it("ajoute un slug absent", () => {
		useSelection.getState().add("bar");
		expect(useSelection.getState().selected).toContain("bar");
	});

	it("ne duplique pas un slug déjà présent", () => {
		useSelection.getState().add("bar");
		useSelection.getState().add("bar");
		expect(
			useSelection.getState().selected.filter((s) => s === "bar"),
		).toHaveLength(1);
	});
});

describe("useSelection — remove", () => {
	it("retire le slug ciblé", () => {
		useSelection.getState().add("baz");
		useSelection.getState().remove("baz");
		expect(useSelection.getState().selected).not.toContain("baz");
	});

	it("ne plante pas si le slug est absent", () => {
		expect(() => useSelection.getState().remove("inexistant")).not.toThrow();
	});
});

describe("useSelection — clear", () => {
	it("vide la sélection et réinitialise defaultInitialized + seenDefaultSlugs", () => {
		useSelection.getState().add("a");
		useSelection.getState().add("b");
		useSelection.getState().initDefaults(["a", "b"]);
		useSelection.getState().clear();
		const s = useSelection.getState();
		expect(s.selected).toHaveLength(0);
		expect(s.defaultInitialized).toBe(false);
		expect(s.seenDefaultSlugs).toHaveLength(0);
	});
});

describe("useSelection — has", () => {
	it("renvoie true si le slug est sélectionné", () => {
		useSelection.getState().add("x");
		expect(useSelection.getState().has("x")).toBe(true);
	});

	it("renvoie false si le slug est absent", () => {
		expect(useSelection.getState().has("y")).toBe(false);
	});
});

describe("useSelection — initDefaults", () => {
	it("première visite : sélectionne tous les default-slugs", () => {
		useSelection.getState().initDefaults(["a", "b", "c"]);
		const s = useSelection.getState();
		expect(s.selected).toEqual(expect.arrayContaining(["a", "b", "c"]));
		expect(s.defaultInitialized).toBe(true);
		expect(s.seenDefaultSlugs).toEqual(expect.arrayContaining(["a", "b", "c"]));
	});

	it("deuxième visite : re-sélectionne les default-slugs décrochés (default_on = toujours présent)", () => {
		useSelection.getState().initDefaults(["a", "b"]);
		useSelection.getState().toggle("a"); // l'utilisateur décoche 'a' en session
		useSelection.getState().initDefaults(["a", "b"]); // rechargement / nouvelle visite
		// default_on = "Essential" → re-sélectionné même après déselection manuelle
		expect(useSelection.getState().selected).toContain("a");
		expect(useSelection.getState().selected).toContain("b");
	});

	it("migration : ajoute les nouveaux default-slugs à un utilisateur déjà initialisé", () => {
		// Simule l'ancien état : initialisé avec 2 slugs, sans seenDefaultSlugs (migration localStorage)
		useSelection.setState({
			selected: ["a", "b"],
			defaultInitialized: true,
			seenDefaultSlugs: [],
		});
		// Le registre ajoute 'c' comme nouveau must
		useSelection.getState().initDefaults(["a", "b", "c"]);
		expect(useSelection.getState().selected).toContain("c");
		expect(useSelection.getState().selected).toContain("a");
		expect(useSelection.getState().selected).toContain("b");
	});

	it("ne duplique pas un default-slug déjà dans selected", () => {
		useSelection.getState().add("a");
		useSelection.getState().initDefaults(["a", "b"]);
		const occurrences = useSelection
			.getState()
			.selected.filter((s) => s === "a");
		expect(occurrences).toHaveLength(1);
	});
});
