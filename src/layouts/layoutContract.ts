﻿/**
 * Layout metadata.
 */
export interface LayoutContract {
    /**
     * Unique identifier.
     */
    key?: string;

    /**
     * Layout title, e.g. Master page.
     */
    title: string;

    /**
     * Layout description.
     */
    description: string;

    /**
     * Template of URL where layout needs to be applied.
     */
    permalinkTemplate: string;

    /**
     * Key of the document describing content.
     */
    contentKey?: string;
}