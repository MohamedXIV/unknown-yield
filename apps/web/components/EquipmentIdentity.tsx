import type { EntityIdentity } from "../game/identity";

/** Name, then the optional nickname, typeplate designation and description. */
export default function EquipmentIdentity({
  identity,
}: {
  identity: EntityIdentity;
}) {
  return (
    <>
      <h2>{identity.name}</h2>
      {identity.nickname && (
        <p className="identity-nickname">“{identity.nickname}”</p>
      )}
      {identity.designation && (
        <small className="identity-plate">{identity.designation}</small>
      )}
      {identity.description && (
        <p className="identity-description">{identity.description}</p>
      )}
    </>
  );
}
