import sx from "./loadouts.module.css";

export function LoadoutsView() {
  return (
    <article class={sx.loadouts}>
      <div class={sx.loadout}>
        <ul class={sx.equipment}></ul>
      </div>
    </article>
  );
}
