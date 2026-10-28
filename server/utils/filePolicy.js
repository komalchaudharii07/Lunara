// Who may read a stored file. Pure function, so it is easy to test.
//   asset: the FileAsset
//   who:   { userId, isAdmin, doctorId (the doctor profile this login owns, if any), assetDoctorApproved }
const same = (a, b) => a != null && b != null && String(a) === String(b);

const canReadFile = (asset, who) => {
  if (!asset || !who?.userId) return false;

  switch (asset.kind) {
    // profile pictures: the doctor, an admin, or anyone logged in once the doctor is approved
    case "doctor_photo":
      return same(asset.owner, who.userId) || Boolean(who.isAdmin) || Boolean(who.assetDoctorApproved);

    // licence documents: only the doctor and admins
    case "doctor_licence":
      return same(asset.owner, who.userId) || Boolean(who.isAdmin);

    // medical reports: only the patient and the doctor they belong to. Not admins.
    case "medical_report":
      return same(asset.patient, who.userId) || (who.doctorId != null && same(asset.doctor, who.doctorId));

    default:
      return false;
  }
};

module.exports = { canReadFile };