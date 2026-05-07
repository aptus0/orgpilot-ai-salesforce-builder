public with sharing class SmartCreditAdverseActionFlowActions {
    public class AdverseActionRequest {
        @InvocableVariable(required=true)
        public String decision;

        @InvocableVariable
        public Date adverseActionDate;
    }

    public class AdverseActionResponse {
        @InvocableVariable
        public Date resolvedDate;
    }

    @InvocableMethod(label='Resolve Adverse Action Date' description='Defaults adverse action notice date when a denial or counter-offer occurs.')
    public static List<AdverseActionResponse> resolveAdverseActionDate(
        List<AdverseActionRequest> requests
    ) {
        List<AdverseActionResponse> responses = new List<AdverseActionResponse>();

        for (AdverseActionRequest request : requests) {
            AdverseActionResponse response = new AdverseActionResponse();
            Boolean adverseDecision =
                request.decision == 'Deny' ||
                request.decision == 'Counter-offer';

            response.resolvedDate =
                adverseDecision && request.adverseActionDate == null
                    ? Date.today()
                    : request.adverseActionDate;

            responses.add(response);
        }

        return responses;
    }
}
