
import { ValidationStatus } from "./ValidationStatus";

export const getOverallValidationStatus = (validations) => {

        const howMany = validations.length;
        const howManyValid = validations.filter(x => x.validationStatus === ValidationStatus.Valid).length;
        if (howManyValid === howMany) {
            return {
                validationStatus: ValidationStatus.Valid
            }
        } else {
            var howManyErrors = validations.filter(x => x.validationStatus === ValidationStatus.Error).length;
            if (howManyErrors > 0) {
                return {
                    howManyInvalid: howManyErrors,
                    validationStatus: ValidationStatus.Error
                }
            } else {
                var howManyInvalid = validations.filter(x => x.validationStatus === ValidationStatus.Invalid).length;
                if (howManyInvalid > 0) {
                    return {
                        howManyInvalid: howManyInvalid,
                        validationStatus: ValidationStatus.Invalid
                    }
                } else {
                    return {
                        validationStatus: ValidationStatus.NotValidated
                    }
                }
            }
        }
    }

export const sortValidationSections = (validationSections) => {
    validationSections.sort((a,b) => {
        const validationStatusA = a.overallValidationStatus.validationStatus;
        const validationStatusB = b.overallValidationStatus.validationStatus;
        
        if (validationStatusA === validationStatusB) {
            return 0;
        } else {
            const aScore = getSortingScore(validationStatusA);
            const bScore = getSortingScore(validationStatusB);
            return (aScore < bScore) ? -1 : 1;
        }
    });
}

export const sortValidations = (validations) => {
    validations.sort((a,b) => {
        const validationStatusA = a.validationStatus;
        const rankA = (a.rank) ? a.rank / 10000 : 0;
        const validationStatusB = b.validationStatus;
        const rankB = (b.rank) ? b.rank / 10000 : 0;

        if (validationStatusA === validationStatusB) {
            return rankA - rankB;
        } else {
            const aScore = getSortingScore(validationStatusA);
            const bScore = getSortingScore(validationStatusB);
            return aScore - bScore;
        }
    })
}

export const getSortingScore = (validationStatus) => {
        var score = 0;
        switch (validationStatus) {
            case ValidationStatus.Invalid:
                score = -4;
                break;
            case ValidationStatus.Error:
                score = -3;
                break;
            case ValidationStatus.ValidationInProgress:
                score = -2;
                break;
            case ValidationStatus.Valid:
                score = -1;
                break;
            case ValidationStatus.NotValidated:
                score = 0;
                break;
        }
        return score;
    }

