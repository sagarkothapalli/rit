export default function ComplaintEligibilityReview({
  relatedRtiExists,
  groundIsAppealLike,
}: {
  relatedRtiExists: boolean;
  groundIsAppealLike: boolean;
}) {
  return (
    <div className="step-hint">
      <p>
        A Section 18 complaint is not an appeal. An appeal asks the FAA or the Commission to decide a request that
        was filed. A complaint asks the Commission to look at a failure in the process itself.
      </p>
      {groundIsAppealLike && relatedRtiExists && (
        <p>
          If a request was filed and you are mainly dissatisfied with the reply or with silence, a first or second
          appeal is usually the correct next step. You can still prepare this complaint; the Commission decides how
          to treat it.
        </p>
      )}
      {!relatedRtiExists && (
        <p>
          You can complain where you were unable to submit a request, including where no PIO was appointed or
          forwarding was refused.
        </p>
      )}
    </div>
  );
}
